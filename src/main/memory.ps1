$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$cs = @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

public static class ErMem
{
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern IntPtr OpenProcess(uint access, bool inherit, int pid);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool CloseHandle(IntPtr handle);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool ReadProcessMemory(IntPtr h, IntPtr addr, byte[] buf, IntPtr size, out IntPtr read);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool WriteProcessMemory(IntPtr h, IntPtr addr, byte[] buf, IntPtr size, out IntPtr written);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern int VirtualQueryEx(IntPtr h, IntPtr addr, out MEMORY_BASIC_INFORMATION mbi, IntPtr len);

    [DllImport("psapi.dll", SetLastError = true)]
    static extern bool EnumProcessModulesEx(IntPtr h, IntPtr[] modules, int cb, out int needed, int filter);

    [DllImport("psapi.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern uint GetModuleBaseName(IntPtr h, IntPtr module, StringBuilder name, int size);

    [DllImport("psapi.dll", SetLastError = true)]
    static extern bool GetModuleInformation(IntPtr h, IntPtr module, out MODULEINFO info, int size);

    [StructLayout(LayoutKind.Sequential)]
    public struct MEMORY_BASIC_INFORMATION
    {
        public ulong BaseAddress;
        public ulong AllocationBase;
        public uint AllocationProtect;
        public uint Alignment1;
        public ulong RegionSize;
        public uint State;
        public uint Protect;
        public uint Type;
        public uint Alignment2;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct MODULEINFO
    {
        public IntPtr lpBaseOfDll;
        public uint SizeOfImage;
        public IntPtr EntryPoint;
    }

    const uint PROCESS_ALL_ACCESS = 0x1F0FFF;
    const uint MEM_COMMIT = 0x1000;
    const uint MEM_PRIVATE = 0x20000;
    const uint PAGE_READWRITE = 0x04;
    const uint PAGE_WRITECOPY = 0x08;
    const uint PAGE_EXECUTE_READWRITE = 0x40;
    const uint PAGE_EXECUTE_WRITECOPY = 0x80;
    const int MODULE_FILTER_ALL = 0x03;

    static IntPtr handle = IntPtr.Zero;
    public static int Pid = 0;
    public static ulong ModuleBase = 0;
    public static uint ModuleSize = 0;
    public static string ModuleName = "";
    public static string LastError = "";

    static List<ulong> hits = new List<ulong>();
    static List<double> lastVals = new List<double>();
    static string hitType = "int32";
    public static bool ScanTruncated = false;

    public static bool IsAttached
    {
        get { return handle != IntPtr.Zero && handle != new IntPtr(-1); }
    }

    public static string Attach(string processName)
    {
        Detach();
        string bare = processName;
        if (bare.EndsWith(".exe", StringComparison.OrdinalIgnoreCase)) bare = bare.Substring(0, bare.Length - 4);
        Process[] procs = Process.GetProcessesByName(bare);
        if (procs == null || procs.Length == 0) throw new Exception("PROCESS_NOT_FOUND");
        // لو فيه أكثر من عملية بنفس الاسم (نسخة قديمة أو عملية تجريبية)، نبدأ
        // بالأكبر بالذاكرة لأن اللعبة الحقيقية أكبر بكثير من أي عملية أخرى.
        Array.Sort(procs, (a, b) =>
        {
            long wa = 0, wb = 0;
            try { wa = a.WorkingSet64; } catch { }
            try { wb = b.WorkingSet64; } catch { }
            return wb.CompareTo(wa);
        });
        string lastError = "MODULE_NOT_FOUND";
        foreach (Process proc in procs)
        {
            int targetPid = proc.Id;
            handle = OpenProcess(PROCESS_ALL_ACCESS, false, targetPid);
            if (handle == IntPtr.Zero)
            {
                int err = Marshal.GetLastWin32Error();
                handle = IntPtr.Zero;
                lastError = "OPEN_FAILED:" + err;
                continue;
            }
            Pid = targetPid;
            IntPtr[] modules = new IntPtr[2048];
            int needed;
            if (!EnumProcessModulesEx(handle, modules, modules.Length * IntPtr.Size, out needed, MODULE_FILTER_ALL))
            {
                Detach();
                lastError = "ENUM_MODULES_FAILED";
                continue;
            }
            int count = needed / IntPtr.Size;
            bool found = false;
            for (int i = 0; i < count; i++)
            {
                StringBuilder sb = new StringBuilder(300);
                GetModuleBaseName(handle, modules[i], sb, sb.Capacity);
                if (string.Equals(sb.ToString(), processName, StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(sb.ToString(), bare + ".exe", StringComparison.OrdinalIgnoreCase))
                {
                    MODULEINFO mi;
                    if (GetModuleInformation(handle, modules[i], out mi, Marshal.SizeOf(typeof(MODULEINFO))))
                    {
                        ModuleBase = (ulong)mi.lpBaseOfDll.ToInt64();
                        ModuleSize = mi.SizeOfImage;
                        ModuleName = sb.ToString();
                        found = true;
                        break;
                    }
                }
            }
            if (found) return targetPid + "|" + ModuleBase + "|" + ModuleSize + "|" + ModuleName;
            Detach();
        }
        throw new Exception(lastError);
    }

    public static void Detach()
    {
        if (handle != IntPtr.Zero && handle != new IntPtr(-1)) CloseHandle(handle);
        handle = IntPtr.Zero;
        Pid = 0;
        ModuleBase = 0;
        ModuleSize = 0;
        ModuleName = "";
        hits.Clear();
        lastVals.Clear();
    }

    static void EnsureAttached()
    {
        if (!IsAttached) throw new Exception("NOT_ATTACHED");
    }

    public static int SizeOf(string type)
    {
        switch (type)
        {
            case "int8": return 1;
            case "int16": return 2;
            case "int32": return 4;
            case "uint32": return 4;
            case "int64": return 8;
            case "float": return 4;
            case "double": return 8;
        }
        throw new Exception("BAD_TYPE:" + type);
    }

    static ulong ReadPtr(ulong addr)
    {
        byte[] buf = new byte[8];
        IntPtr read;
        if (!ReadProcessMemory(handle, (IntPtr)(long)addr, buf, (IntPtr)8, out read) || read.ToInt64() < 8)
            throw new Exception("READ_FAILED:0x" + addr.ToString("X"));
        return BitConverter.ToUInt64(buf, 0);
    }

    static ulong Resolve(ulong addr, long[] chain)
    {
        ulong p = addr;
        if (chain == null) return p;
        for (int i = 0; i < chain.Length; i++)
        {
            ulong ptr = ReadPtr(p);
            if (ptr == 0) throw new Exception("CHAIN_NULL:step=" + i);
            long next = (long)ptr + chain[i];
            if (next <= 0) throw new Exception("CHAIN_INVALID:step=" + i);
            p = (ulong)next;
        }
        return p;
    }

    static double ReadAt(ulong addr, string type)
    {
        int size = SizeOf(type);
        byte[] buf = new byte[size];
        IntPtr read;
        if (!ReadProcessMemory(handle, (IntPtr)(long)addr, buf, (IntPtr)size, out read) || read.ToInt64() != size)
            throw new Exception("READ_FAILED:0x" + addr.ToString("X"));
        switch (type)
        {
            case "int8": return (sbyte)buf[0];
            case "int16": return BitConverter.ToInt16(buf, 0);
            case "int32": return BitConverter.ToInt32(buf, 0);
            case "uint32": return BitConverter.ToUInt32(buf, 0);
            case "int64": return BitConverter.ToInt64(buf, 0);
            case "float": return BitConverter.ToSingle(buf, 0);
            case "double": return BitConverter.ToDouble(buf, 0);
        }
        throw new Exception("BAD_TYPE:" + type);
    }

    static void WriteAt(ulong addr, string type, double value)
    {
        int size = SizeOf(type);
        byte[] buf = new byte[size];
        switch (type)
        {
            case "int8": buf[0] = (byte)(sbyte)value; break;
            case "int16": Array.Copy(BitConverter.GetBytes((short)value), buf, 2); break;
            case "int32": Array.Copy(BitConverter.GetBytes((int)value), buf, 4); break;
            case "uint32": Array.Copy(BitConverter.GetBytes((uint)value), buf, 4); break;
            case "int64": Array.Copy(BitConverter.GetBytes((long)value), buf, 8); break;
            case "float": Array.Copy(BitConverter.GetBytes((float)value), buf, 4); break;
            case "double": Array.Copy(BitConverter.GetBytes(value), buf, 8); break;
            default: throw new Exception("BAD_TYPE:" + type);
        }
        IntPtr written;
        if (!WriteProcessMemory(handle, (IntPtr)(long)addr, buf, (IntPtr)size, out written) || written.ToInt64() != size)
        {
            int err = Marshal.GetLastWin32Error();
            throw new Exception("WRITE_FAILED:" + err);
        }
    }

    public static double ReadVal(long addr, long[] chain, string type)
    {
        EnsureAttached();
        return ReadAt(Resolve((ulong)addr, chain), type);
    }

    public static void WriteVal(long addr, long[] chain, string type, double value)
    {
        EnsureAttached();
        WriteAt(Resolve((ulong)addr, chain), type, value);
    }

    public static double ReadAbs(long addr, string type)
    {
        EnsureAttached();
        return ReadAt((ulong)addr, type);
    }

    public static void WriteAbs(long addr, string type, double value)
    {
        EnsureAttached();
        WriteAt((ulong)addr, type, value);
    }

    static void AddHit(ulong addr, double value)
    {
        hits.Add(addr);
        lastVals.Add(value);
    }

    static unsafe void ScanChunk(byte[] buf, int len, string type, double target, ulong baseAddr, int align, int max)
    {
        if (len < 8) return;
        fixed (byte* p0 = buf)
        {
            byte* p = p0;
            if (type == "int32")
            {
                int t = (int)target;
                for (int i = 0; i + 4 <= len; i += align)
                {
                    if (*(int*)(p + i) == t)
                    {
                        AddHit(baseAddr + (ulong)i, t);
                        if (hits.Count >= max) { ScanTruncated = true; return; }
                    }
                }
            }
            else if (type == "int64")
            {
                long t = (long)target;
                for (int i = 0; i + 8 <= len; i += align)
                {
                    if (*(long*)(p + i) == t)
                    {
                        AddHit(baseAddr + (ulong)i, t);
                        if (hits.Count >= max) { ScanTruncated = true; return; }
                    }
                }
            }
            else if (type == "float")
            {
                float t = (float)target;
                for (int i = 0; i + 4 <= len; i += align)
                {
                    if (*(float*)(p + i) == t)
                    {
                        AddHit(baseAddr + (ulong)i, t);
                        if (hits.Count >= max) { ScanTruncated = true; return; }
                    }
                }
            }
            else if (type == "double")
            {
                for (int i = 0; i + 8 <= len; i += align)
                {
                    if (*(double*)(p + i) == target)
                    {
                        AddHit(baseAddr + (ulong)i, target);
                        if (hits.Count >= max) { ScanTruncated = true; return; }
                    }
                }
            }
            else if (type == "int16")
            {
                short t = (short)target;
                for (int i = 0; i + 2 <= len; i += align)
                {
                    if (*(short*)(p + i) == t)
                    {
                        AddHit(baseAddr + (ulong)i, t);
                        if (hits.Count >= max) { ScanTruncated = true; return; }
                    }
                }
            }
            else if (type == "int8")
            {
                sbyte t = (sbyte)target;
                for (int i = 0; i < len; i += align)
                {
                    if (*(sbyte*)(p + i) == t)
                    {
                        AddHit(baseAddr + (ulong)i, t);
                        if (hits.Count >= max) { ScanTruncated = true; return; }
                    }
                }
            }
            else throw new Exception("BAD_TYPE:" + type);
        }
    }

    public static int ScanStart(string type, double value, int max)
    {
        EnsureAttached();
        hits.Clear();
        lastVals.Clear();
        hitType = type;
        ScanTruncated = false;
        int size = SizeOf(type);
        int align = size >= 4 ? 4 : size;
        ulong addr = 0x10000;
        ulong maxAddr = 0x7FFFFFFEFFFF;
        byte[] big = new byte[16 * 1024 * 1024];
        int mbiSize = Marshal.SizeOf(typeof(MEMORY_BASIC_INFORMATION));
        while (addr < maxAddr)
        {
            MEMORY_BASIC_INFORMATION mbi;
            if (VirtualQueryEx(handle, (IntPtr)(long)addr, out mbi, (IntPtr)mbiSize) == 0) break;
            ulong regionBase = mbi.BaseAddress;
            ulong regionSize = mbi.RegionSize;
            bool scannable = mbi.State == MEM_COMMIT && mbi.Type == MEM_PRIVATE &&
                (mbi.Protect == PAGE_READWRITE || mbi.Protect == PAGE_WRITECOPY ||
                 mbi.Protect == PAGE_EXECUTE_READWRITE || mbi.Protect == PAGE_EXECUTE_WRITECOPY);
            if (scannable && regionSize > 0)
            {
                ulong off = 0;
                while (off < regionSize)
                {
                    int chunk = (int)Math.Min((ulong)big.Length, regionSize - off);
                    IntPtr read;
                    if (ReadProcessMemory(handle, (IntPtr)(long)(regionBase + off), big, (IntPtr)chunk, out read) && read.ToInt64() > 0)
                    {
                        ScanChunk(big, (int)read.ToInt64(), type, value, regionBase + off, align, max);
                    }
                    off += (ulong)chunk;
                    if (ScanTruncated) break;
                }
            }
            if (regionSize == 0) break;
            addr = regionBase + regionSize;
            if (ScanTruncated) break;
        }
        return hits.Count;
    }

    static bool SameValue(double a, double b)
    {
        if (hitType == "float" || hitType == "double") return Math.Abs(a - b) < 0.0001;
        return a == b;
    }

    public static int ScanNext(string mode, double value)
    {
        EnsureAttached();
        List<ulong> newHits = new List<ulong>();
        List<double> newVals = new List<double>();
        for (int i = 0; i < hits.Count; i++)
        {
            double cur;
            try { cur = ReadAt(hits[i], hitType); }
            catch { continue; }
            bool keep;
            switch (mode)
            {
                case "exact": keep = SameValue(cur, value); break;
                case "changed": keep = !SameValue(cur, lastVals[i]); break;
                case "unchanged": keep = SameValue(cur, lastVals[i]); break;
                case "increased": keep = cur > lastVals[i]; break;
                case "decreased": keep = cur < lastVals[i]; break;
                default: throw new Exception("BAD_MODE:" + mode);
            }
            if (keep)
            {
                newHits.Add(hits[i]);
                newVals.Add(cur);
            }
        }
        hits = newHits;
        lastVals = newVals;
        return hits.Count;
    }

    public static void ScanReset()
    {
        hits.Clear();
        lastVals.Clear();
        ScanTruncated = false;
    }

    public static string ScanPage(int offset, int limit)
    {
        if (offset < 0) offset = 0;
        if (limit <= 0) limit = 50;
        StringBuilder sb = new StringBuilder();
        int end = Math.Min(hits.Count, offset + limit);
        for (int i = offset; i < end; i++)
        {
            double v = 0;
            try { v = ReadAt(hits[i], hitType); } catch { }
            if (sb.Length > 0) sb.Append('\n');
            sb.Append(hits[i].ToString());
            sb.Append('|');
            sb.Append(v.ToString(System.Globalization.CultureInfo.InvariantCulture));
        }
        return sb.ToString();
    }

    public static int HitCount { get { return hits.Count; } }
    public static string HitType { get { return hitType; } }

    static byte[] ParsePattern(string pattern, out bool[] mask)
    {
        string[] parts = pattern.Trim().Split(new char[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
        byte[] bytes = new byte[parts.Length];
        mask = new bool[parts.Length];
        for (int i = 0; i < parts.Length; i++)
        {
            string p = parts[i];
            if (p == "??" || p == "?")
            {
                bytes[i] = 0;
                mask[i] = false;
            }
            else
            {
                bytes[i] = Convert.ToByte(p, 16);
                mask[i] = true;
            }
        }
        return bytes;
    }

    static bool MatchBytes(byte[] buf, int at, byte[] pat, bool[] mask)
    {
        for (int i = 0; i < pat.Length; i++)
        {
            if (mask[i] && buf[at + i] != pat[i]) return false;
        }
        return true;
    }

    // Scans the main module for an AOB pattern. When resolveRip is true the
    // matched instruction is treated as `mov reg,[rip+disp32]` and the address
    // of the referenced global is returned.
    public static string AobScan(string pattern, bool resolveRip, int instrLen, int max)
    {
        EnsureAttached();
        bool[] mask;
        byte[] pat = ParsePattern(pattern, out mask);
        if (pat.Length == 0) throw new Exception("BAD_PATTERN");
        List<ulong> found = new List<ulong>();
        int chunk = 8 * 1024 * 1024;
        int overlap = pat.Length - 1;
        byte[] buf = new byte[chunk + overlap];
        ulong offset = 0;
        while (offset < (ulong)ModuleSize)
        {
            ulong left = (ulong)ModuleSize - offset;
            int want = (int)Math.Min((ulong)buf.Length, left);
            IntPtr read;
            if (ReadProcessMemory(handle, (IntPtr)(long)(ModuleBase + offset), buf, (IntPtr)want, out read) && read.ToInt64() > 0)
            {
                int len = (int)read.ToInt64();
                for (int i = 0; i + pat.Length <= len; i++)
                {
                    if (!MatchBytes(buf, i, pat, mask)) continue;
                    ulong hit = ModuleBase + offset + (ulong)i;
                    if (resolveRip)
                    {
                        if (i + 7 > len) continue;
                        int disp = BitConverter.ToInt32(buf, i + 3);
                        hit = (ulong)((long)hit + instrLen + disp);
                    }
                    if (!found.Contains(hit)) found.Add(hit);
                    if (found.Count >= max) return string.Join(",", found.ConvertAll(x => x.ToString()).ToArray());
                }
            }
            if (left <= (ulong)chunk) break;
            offset += (ulong)chunk;
        }
        return string.Join(",", found.ConvertAll(x => x.ToString()).ToArray());
    }
}
'@

$provider = New-Object Microsoft.CSharp.CSharpCodeProvider
$cp = New-Object System.CodeDom.Compiler.CompilerParameters
$cp.GenerateInMemory = $true
$cp.GenerateExecutable = $false
$cp.CompilerOptions = '/unsafe'
[void]$cp.ReferencedAssemblies.Add('System.dll')
$compiled = $provider.CompileAssemblyFromSource($cp, $cs)
if ($compiled.Errors.HasErrors) {
    $msgs = @()
    foreach ($e in $compiled.Errors) { $msgs += $e.ToString() }
    [Console]::Out.WriteLine('@@{"ok":false,"error":"COMPILE_ERROR: ' + ($msgs -join ' | ').Replace('"', "'") + '"}')
    [Console]::Out.Flush()
    exit 1
}

function Respond($obj) {
    $json = $obj | ConvertTo-Json -Compress -Depth 6
    [Console]::Out.WriteLine('@@' + $json)
    [Console]::Out.Flush()
}

function ToLongArray($value) {
    if ($null -eq $value) { return [long[]]@() }
    $list = New-Object System.Collections.Generic.List[long]
    foreach ($item in @($value)) { $list.Add([long]$item) }
    return $list.ToArray()
}

Respond @{ ok = $true; event = 'ready' }

while ($true) {
    $line = [Console]::In.ReadLine()
    if ($null -eq $line) { break }
    if ($line.Trim().Length -eq 0) { continue }

    try {
        $cmd = $line | ConvertFrom-Json
        $data = @{}
        switch ([string]$cmd.cmd) {
            'attach' {
                $info = [ErMem]::Attach([string]$cmd.process)
                $parts = $info.Split('|')
                $data = @{
                    pid        = [long]$parts[0]
                    moduleBase = [long]$parts[1]
                    moduleSize = [long]$parts[2]
                    moduleName = [string]$parts[3]
                }
            }
            'detach' {
                [ErMem]::Detach()
                $data = @{ detached = $true }
            }
            'status' {
                $data = @{
                    attached   = [ErMem]::IsAttached
                    pid        = [long][ErMem]::Pid
                    moduleBase = [long][ErMem]::ModuleBase
                    moduleSize = [long][ErMem]::ModuleSize
                    hits       = [ErMem]::HitCount
                }
            }
            'read' {
                $chain = ToLongArray $cmd.chain
                $v = [ErMem]::ReadVal([long]$cmd.addr, $chain, [string]$cmd.type)
                $data = @{ value = $v }
            }
            'write' {
                $chain = ToLongArray $cmd.chain
                [ErMem]::WriteVal([long]$cmd.addr, $chain, [string]$cmd.type, [double]$cmd.value)
                $data = @{ written = $true }
            }
            'readAbs' {
                $v = [ErMem]::ReadAbs([long]$cmd.addr, [string]$cmd.type)
                $data = @{ value = $v }
            }
            'writeAbs' {
                [ErMem]::WriteAbs([long]$cmd.addr, [string]$cmd.type, [double]$cmd.value)
                $data = @{ written = $true }
            }
            'scanStart' {
                $count = [ErMem]::ScanStart([string]$cmd.type, [double]$cmd.value, [int]$cmd.max)
                $data = @{ count = $count; truncated = [ErMem]::ScanTruncated; type = [string]$cmd.type }
            }
            'scanNext' {
                $count = [ErMem]::ScanNext([string]$cmd.mode, [double]$cmd.value)
                $data = @{ count = $count; truncated = [ErMem]::ScanTruncated }
            }
            'scanReset' {
                [ErMem]::ScanReset()
                $data = @{ count = 0 }
            }
            'scanPage' {
                $page = [ErMem]::ScanPage([int]$cmd.offset, [int]$cmd.limit)
                $data = @{
                    page  = $page
                    count = [ErMem]::HitCount
                    type  = [ErMem]::HitType
                }
            }
            'aobScan' {
                $rip = $false
                if ($null -ne $cmd.resolveRip) { $rip = [bool]$cmd.resolveRip }
                $instrLen = 7
                if ($null -ne $cmd.instrLen) { $instrLen = [int]$cmd.instrLen }
                $max = 8
                if ($null -ne $cmd.max) { $max = [int]$cmd.max }
                $addresses = [ErMem]::AobScan([string]$cmd.pattern, $rip, $instrLen, $max)
                $data = @{ addresses = $addresses }
            }
            'ping' {
                $data = @{ pong = $true; attached = [ErMem]::IsAttached }
            }
            default { throw "BAD_COMMAND" }
        }
        Respond @{ ok = $true; id = $cmd.id; data = $data }
    }
    catch {
        $msg = $_.Exception.Message
        Respond @{ ok = $false; id = $cmd.id; error = $msg }
    }
}