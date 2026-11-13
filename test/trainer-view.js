function cheatStatus(cheat, tr) {
  if (cheat.kind === 'full') return { cls: 'act', label: 'مرة وحدة', hint: 'اضغط الزر عشان يعبّي القيمة داخل اللعبة.' };
  if (!cheat.enabled) return { cls: 'off', label: 'طافي', hint: 'فعّله عشان يشتغل داخل اللعبة.' };
  if (cheat.applied) return { cls: 'on', label: 'شغال الآن', hint: 'مطبّق داخل اللعبة ومؤكد بالقراءة.' };
  if (!tr.attached) return { cls: 'wait', label: 'ينتظر الاتصال', hint: 'شغّل اللعبة واضغط «اتصال باللعبة».' };
  return { cls: 'wait', label: 'ينتظر الشخصية', hint: 'حمّل شخصيتك (Continue) وهو يشتغل تلقائياً.' };
}

function cheatTile(cheat, tr) {
  const status = cheatStatus(cheat, tr);
  const control =
    cheat.kind === 'full'
      ? `<button class="btn btn-sm btn-primary" data-act="cheatAction" data-id="${esc(cheat.id)}">عبّئ الآن</button>`
      : `<label class="switch" title="${cheat.enabled ? 'إيقاف' : 'تفعيل'}">
          <input type="checkbox" data-cheat-toggle="${esc(cheat.id)}" ${cheat.enabled ? 'checked' : ''} />
          <span></span>
        </label>`;
  return `
  <div class="cheat-tile ${status.cls}" data-cheat-id="${esc(cheat.id)}">
    <div class="cheat-glyph">${icon(cheat.icon || 'wand')}</div>
    <div class="cheat-copy">
      <div class="cheat-title">${esc(cheat.name)}${cheat.warn ? ' <span class="tiny warn-dot" title="تعديل تجريبي — قد يجمّد شخصيتك">⚠</span>' : ''}</div>
      <div class="cheat-desc">${esc(cheat.desc)}</div>
      <div class="cheat-state ${status.cls}" title="${esc(status.hint)}"><span class="state-dot"></span>${status.label}</div>
    </div>
    ${control}
  </div>`;
}

function liveBar(key, label, value, max, cls) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (Number(value) / Number(max)) * 100)) : 0;
  return `<div class="live-bar-row">
    <span class="live-bar-label">${esc(label)}</span>
    <span class="live-bar-track"><span class="live-bar-fill ${cls}" data-live-fill="${key}" style="width:${pct.toFixed(1)}%"></span></span>
    <span class="live-bar-num mono"><b data-live-num="${key}">${fmtNum(value)}</b><small> / ${fmtNum(max)}</small></span>
  </div>`;
}

function viewTrainer() {
  const st = state();
  const tr = st.trainer;
  const groupIcons = { اللاعب: 'heart', القتال: 'sword', الموارد: 'coin', المتعة: 'spark' };
  const groups = tr.groups.map((group) => ({
    group,
    icon: groupIcons[group] || 'wand',
    cheats: tr.cheats.filter((c) => c.group === group),
  }));
  const builtins = tr.presets.filter((p) => !p.saved);
  const saved = tr.presets.filter((p) => p.saved);
  const scan = S.scan;
  const pageStart = scan.offset + 1;
  const pageEnd = Math.min(scan.offset + scan.rows.length, scan.count);
  const ready = tr.attached;
  const live = tr.live || {};
  const inGame = !!tr.inGame;

  return `
  <div class="view-head">
    <div>
      <div class="eyebrow">التعديلات · أوفلاين</div>
      <h1 class="view-title">التعديلات</h1>
      <div class="view-sub">تشتغل فعلياً داخل اللعبة — بدون عناوين ولا إعدادات. فعّل والعب.</div>
    </div>
    <div class="head-actions">
      <span class="pill ${inGame ? 'ok' : ready ? 'warn' : ''}" id="trainerStatePill">${inGame ? 'داخل اللعبة' : ready ? 'بانتظار الشخصية' : 'غير متصل'}</span>
      ${ready ? `<button class="btn btn-sm btn-ghost" data-act="detachTrainer">فصل</button>` : `<button class="btn btn-primary" data-act="attachTrainer">${icon('link')} اتصال باللعبة</button>`}
    </div>
  </div>

  <div class="toolbar">
    <div class="toolbar-actions">
      <button class="btn btn-primary" data-act="allCheats" data-enabled="1">${icon('bolt')} تشغيل الكل</button>
      <button class="btn" data-act="allCheats" data-enabled="0">${icon('x')} إيقاف الكل</button>
      <button class="btn" data-act="saveLoadout">${icon('save')} حفظ تشكيلتي</button>
    </div>
    <div class="toolbar-stats">
      ${pill(`${tr.enabledCount} مفعّل`, tr.enabledCount ? 'gold' : '')}
      ${pill(`${tr.appliedCount} شغال فعلياً`, tr.appliedCount ? 'ok' : '')}
      <span class="tiny muted">${ready ? 'متصلين — التعديلات تتطبق وتتأكد كل ثانية' : 'شغّل اللعبة واضغط اتصال'}</span>
    </div>
  </div>

  <div class="banner compact-banner">${icon('alert')}
    <div><strong>خلّك أوفلاين (Solo).</strong> التعديل أونلاين ممكن يبند حسابك — وعلى مسؤوليتك.</div>
  </div>

  <section class="live-panel section-gap">
    <div class="live-head">
      <div class="live-title">${icon('heart')} شخصيتك الآن</div>
      <div class="row-btns">
        ${ready ? `<button class="btn btn-sm btn-ghost" data-act="verifyCheats">${icon('check')} اختبر أن الكتابة تشتغل</button>` : ''}
      </div>
    </div>
    ${
      inGame
        ? `<div class="live-bars">
            ${liveBar('hp', 'الدم', live.hp, live.maxHp, 'hp')}
            ${liveBar('fp', 'الفوكس', live.fp, live.maxFp, 'fp')}
            ${liveBar('sp', 'الستامينا', live.stamina, live.maxStamina, 'sp')}
          </div>
          <div class="live-chips">
            <div class="live-chip">${icon('coin')} <span>الرونز</span><b class="mono" data-live-runes>${fmtNum(live.runes)}</b></div>
            <div class="live-chip">${icon('star')} <span>المستوى</span><b class="mono" data-live-level>${fmtNum(live.level)}</b></div>
            <div class="live-chip">${icon('link')} <span>أساس الشخصية</span><b class="mono tiny">0x${Number(tr.anchors?.worldChrMan || 0).toString(16).toUpperCase()}</b></div>
          </div>`
        : `<div class="live-off">${icon('pause')}
            <div>
              <b>${ready ? 'بانتظار ما تحمّل شخصيتك' : 'اللعبة مو متصلة'}</b>
              <span>${ready ? 'من قائمة اللعبة اختر Continue — أول ما تدخل، القيم بتظهر هنا والتعديلات المفعّلة بتشتغل لحالها.' : 'شغّل اللعبة من الرئيسية، وبعدها اضغط «اتصال باللعبة».'}</span>
            </div>
          </div>`
    }
  </section>

  ${
    tr.warnings && tr.warnings.length
      ? `<div class="banner info section-gap">${icon('alert')}<div>${esc(tr.warnings[0])}</div></div>`
      : ''
  }

  ${groups
    .map(
      ({ group, icon: gi, cheats }) => `
    <section class="cheat-group section-gap">
      <div class="group-head">
        <div class="group-icon">${icon(gi)}</div>
        <div>
          <div class="group-name">${esc(group)}</div>
          <div class="group-sub">${esc(groupDesc(group))}</div>
        </div>
        <div class="group-line"></div>
        <div class="tiny muted">${cheats.filter((c) => c.enabled).length} / ${cheats.length}</div>
      </div>
      <div class="cheat-grid">${cheats.map((c) => cheatTile(c, tr)).join('')}</div>
    </section>`
    )
    .join('')}

  <section class="section-gap">
    <div class="group-head">
      <div class="group-icon">${icon('bookmark')}</div>
      <div><div class="group-name">البريستات</div><div class="group-sub">تشكيلات جاهزة أو من حفظك</div></div>
      <div class="group-line"></div>
      <div class="tiny muted">${builtins.length + saved.length}</div>
    </div>
    <div class="preset-grid">
      ${builtins
        .map(
          (p) => `<div class="preset-card ${tr.activePreset === p.id ? 'active' : ''}">
            <div class="preset-icon">${icon(p.icon || 'bookmark')}</div>
            <div class="preset-copy"><b>${esc(p.name)}</b><span>${esc(p.desc)}</span><small>${p.cheats.length} تعديل</small></div>
            <button class="btn btn-sm" data-act="applyPreset" data-id="${esc(p.id)}">تفعيل</button>
          </div>`
        )
        .join('')}
      ${saved
        .map(
          (p) => `<div class="preset-card saved ${tr.activePreset === p.id ? 'active' : ''}">
            <div class="preset-icon">${icon('bookmark')}</div>
            <div class="preset-copy"><b>${esc(p.name)}</b><span>${esc(p.desc)}</span><small>تشكيلتك المحفوظة</small></div>
            <div class="preset-actions">
              <button class="btn btn-sm" data-act="applyPreset" data-id="${esc(p.id)}">تفعيل</button>
              <button class="btn btn-icon btn-ghost btn-danger" data-act="deletePreset" data-id="${esc(p.id)}" title="حذف">${icon('trash')}</button>
            </div>
          </div>`
        )
        .join('')}
    </div>
  </section>

  <details class="panel section-gap" data-panel="scanner" ${S.openPanels.scanner ? 'open' : ''}>
    <summary>
      <span class="summary-icon">${icon('search')}</span>
      <span><b>فاحص القيم (متقدم)</b><small>لو تبي تدور على قيمة بنفسك — بحث أول وبحث تالي</small></span>
      <span class="summary-chevron">${icon('chevron')}</span>
    </summary>
    <div class="panel-body">
      <div class="hint" style="margin-bottom:12px">
        اكتب الرقم اللي تشوفه في اللعبة → <b>بحث أول</b> → غيّره داخل اللعبة → اكتب الرقم الجديد → <b>بحث تالي</b> → كرّر لين تبقى نتيجة وحدة.
      </div>
      <div class="scan-controls">
        <div class="field">
          <label class="field-label">نوع القيمة</label>
          <select class="select" id="scanType">
            ${[
              ['int32', 'عدد صحيح (رونز/مستوى)'],
              ['float', 'عشري (دم/ستامينا)'],
              ['int64', 'عدد كبير'],
              ['int16', 'عدد صغير'],
              ['int8', 'بايت'],
              ['double', 'عشري مزدوج'],
            ]
              .map(([value, label]) => `<option value="${value}" ${scan.type === value ? 'selected' : ''}>${label}</option>`)
              .join('')}
          </select>
        </div>
        <div class="field">
          <label class="field-label">القيمة اللي تشوفها</label>
          <input class="input mono" id="scanValue" value="${esc(scan.value)}" placeholder="مثال: 12500" inputmode="decimal" />
        </div>
        <button class="btn btn-primary" data-act="scanStart" ${ready ? '' : 'disabled'}>${icon('search')} بحث أول</button>
      </div>
      <div class="scan-controls scan-next">
        <div class="field">
          <label class="field-label">البحث التالي</label>
          <select class="select" id="scanMode">
            <option value="exact" ${scan.mode === 'exact' ? 'selected' : ''}>نفس القيمة</option>
            <option value="increased" ${scan.mode === 'increased' ? 'selected' : ''}>زادت</option>
            <option value="decreased" ${scan.mode === 'decreased' ? 'selected' : ''}>نقصت</option>
            <option value="changed" ${scan.mode === 'changed' ? 'selected' : ''}>تغيّرت</option>
            <option value="unchanged" ${scan.mode === 'unchanged' ? 'selected' : ''}>ما تغيّرت</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">القيمة الجديدة (اختياري)</label>
          <input class="input mono" id="scanNextValue" value="${esc(scan.nextValue)}" placeholder="إذا اخترت نفس القيمة" inputmode="decimal" />
        </div>
        <button class="btn" data-act="scanNext" ${ready && scan.started ? '' : 'disabled'}>${icon('refresh')} بحث تالي</button>
        <button class="btn btn-ghost" data-act="scanReset" ${scan.started ? '' : 'disabled'}>إعادة</button>
      </div>
      <div class="scan-status">
        <span class="dot ${scan.started ? 'dot-live' : ''}"></span>
        <span>${scan.started ? `النتائج: <b>${fmtNum(scan.count)}</b>${scan.truncated ? ' — وصلنا الحد، صفِّ أكثر' : ''}` : ready ? 'ما بعد بحثنا. ابدأ بقيمة من داخل اللعبة.' : 'اتصل باللعبة أول عشان تقدر تفحص القيم.'}</span>
      </div>
      ${
        scan.rows.length
          ? `<div class="results">
              <div class="tiny muted" style="padding:8px 6px">عرض ${pageStart}–${pageEnd} من ${fmtNum(scan.count)}</div>
              ${scan.rows
                .map(
                  (row) => `<div class="result-row">
                    <div class="result-addr" title="${esc(row.addressHex)}">${esc(row.addressHex)}</div>
                    <div class="result-val">${fmtNum(row.value)}</div>
                    <button class="btn btn-sm" data-act="scanWrite" data-addr="${row.address}">غيّر</button>
                  </div>`
                )
                .join('')}
              <div class="pager">
                <button class="btn btn-sm btn-ghost" data-act="scanPage" data-offset="${Math.max(0, scan.offset - 50)}" ${scan.offset <= 0 ? 'disabled' : ''}>اللي قبل</button>
                <button class="btn btn-sm btn-ghost" data-act="scanPage" data-offset="${scan.offset + 50}" ${scan.offset + 50 >= scan.count ? 'disabled' : ''}>اللي بعد</button>
              </div>
            </div>`
          : `<div class="empty small-empty">${icon('target')}<div>${scan.started ? 'ما فيه نتائج — جرّب قيمة ثانية أو غيّر النوع.' : 'النتائج تطلع هنا.'}</div></div>`
      }
    </div>
  </details>`;
}

function groupDesc(group) {
  switch (group) {
    case 'اللاعب':
      return 'دم، فوكس، ستامينا، وتعبئة فورية';
    case 'القتال':
      return 'أدوات ما تنقص، وتعطيل الهجوم/الحركة';
    case 'الموارد':
      return 'رونز ثابتة';
    case 'المتعة':
      return 'سرعة أنميشن الشخصية';
    default:
      return '';
  }
}
