/**
 * 炭火焼肉 燈火 -TOMOSHIBI-
 * main.js
 * -------------------------------------------------------
 * 1. 初期化 / no-js クラスの除去
 * 2. スクロール進捗バー・ヘッダー・追従CTA
 * 3. スマホ用ナビゲーション
 * 4. オープンまでのカウントダウン
 * 5. 部位図（クリックで説明を出し分け）
 * 6. 宴会のお見積りシミュレーター
 * 7. 料理・ドリンクのタブ
 * 8. FVの予約ウィジェット → 予約フォームへの引き継ぎ
 * 9. スクロールアニメーション（AOS）
 * 10. 予約フォームのバリデーション
 */
(function () {
  'use strict';

  // 二重読み込み時に処理が重複しないようにする
  if (window.tomoshibiInitialized) return;
  window.tomoshibiInitialized = true;

  document.body.classList.remove('no-js');

  /* ------------------------------------------------------
     2. progress bar / header / floating cta
     ------------------------------------------------------ */
  var progress = document.getElementById('js-progress');
  var header = document.getElementById('js-header');
  var floatingCta = document.getElementById('js-floating-cta');
  var pagetop = document.getElementById('js-pagetop');
  var ticking = false;

  function onScroll() {
    var scrollTop = window.scrollY;
    var scrollable = document.documentElement.scrollHeight - window.innerHeight;

    if (progress) {
      progress.style.width = (scrollable > 0 ? (scrollTop / scrollable) * 100 : 0) + '%';
    }
    if (header) {
      header.classList.toggle('header--scrolled', scrollTop > 10);
    }

    var passedFv = scrollTop > window.innerHeight * 0.8;
    if (floatingCta) floatingCta.classList.toggle('floating-cta--show', passedFv);
    if (pagetop) pagetop.classList.toggle('pagetop--show', passedFv);

    ticking = false;
  }

  window.addEventListener(
    'scroll',
    function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(onScroll);
    },
    { passive: true }
  );
  onScroll();

  if (pagetop) {
    pagetop.addEventListener('click', function (event) {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ------------------------------------------------------
     3. sp navigation
     ------------------------------------------------------ */
  var navToggle = document.getElementById('js-nav-toggle');
  var nav = document.getElementById('js-nav');

  function closeNav() {
    if (!navToggle || !nav) return;
    navToggle.classList.remove('header__toggle--open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'メニューを開く');
    nav.classList.remove('header__nav--open');
  }

  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('header__nav--open');
      navToggle.classList.toggle('header__toggle--open', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
      navToggle.setAttribute('aria-label', isOpen ? 'メニューを閉じる' : 'メニューを開く');
    });

    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) closeNav();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeNav();
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 991) closeNav();
    });
  }

  /* ------------------------------------------------------
     4. countdown
     ------------------------------------------------------ */
  var cdBody = document.getElementById('js-countdown');

  if (cdBody) {
    // 日本時間で 2026-11-01 17:00。閲覧者の時計がどの地域でも同じ時刻を指すよう
    // タイムゾーン付きで指定している
    var OPEN_AT = new Date('2026-11-01T17:00:00+09:00').getTime();

    var out = {
      days: document.getElementById('js-cd-days'),
      hours: document.getElementById('js-cd-hours'),
      mins: document.getElementById('js-cd-mins'),
      secs: document.getElementById('js-cd-secs')
    };

    function pad(n) {
      return n < 10 ? '0' + n : String(n);
    }

    function tickCountdown() {
      var rest = OPEN_AT - Date.now();

      if (rest <= 0) {
        // オープン後は数字を並べずに一言だけ出す
        cdBody.innerHTML = '<p class="countdown__open">本日オープンしました</p>';
        return false;
      }

      var sec = Math.floor(rest / 1000);
      out.days.textContent = Math.floor(sec / 86400);
      out.hours.textContent = pad(Math.floor(sec / 3600) % 24);
      out.mins.textContent = pad(Math.floor(sec / 60) % 60);
      out.secs.textContent = pad(sec % 60);
      return true;
    }

    if (tickCountdown()) {
      var cdTimer = window.setInterval(function () {
        if (!tickCountdown()) window.clearInterval(cdTimer);
      }, 1000);
    }
  }

  /* ------------------------------------------------------
     5. 部位図
     ------------------------------------------------------ */
  var cutFigure = document.getElementById('js-cut-figure');
  var cutChips = document.getElementById('js-cut-chips');

  if (cutFigure && cutChips) {
    var CUTS = {
      tan: {
        en: 'TONGUE',
        name: 'タン',
        text:
          '牛1頭からおよそ1.5kgしか取れない舌。燈火では根元の芯タンだけを使い、10mmの厚切りにします。片面15秒ずつ、縁が反り返ったら食べどきです。塩とレモンで。',
        menu: '極上タン塩 1,780円'
      },
      kata: {
        en: 'CHUCK ROLL',
        name: '肩ロース',
        text:
          'よく動く部分ですが、きめが細かく風味が濃く出ます。すき焼き用ほど薄くすると味が飛ぶので、5mmで切って赤身の香りを残しています。',
        menu: '特上ザブトン 1,880円'
      },
      rib: {
        en: 'RIB ROAST',
        name: 'リブロース',
        text:
          '背中の中央。サシと赤身の比率が最もよい部位です。厚く切ると脂が重くなるため、3mmで1枚ずつ。さっと炙って引き上げてください。',
        menu: '燈火ロース 1,480円'
      },
      sirloin: {
        en: 'SIRLOIN',
        name: 'サーロイン',
        text:
          '腰の上。きめが細かく、やわらかさでは一番です。1日10食限定で150gのステーキとしてお出しし、こちらだけは店主が焼いてお持ちします。',
        menu: '和牛サーロイン（150g）3,800円'
      },
      ranichi: {
        en: 'RUMP',
        name: 'ランイチ',
        text:
          '腰からお尻にかけての赤身で、ランプとイチボに分かれます。噛むほど味が出るので、脂の強い部位のあと、締めの一皿として。',
        menu: 'イチボ 1,680円'
      },
      misuji: {
        en: 'TOP BLADE',
        name: 'ミスジ',
        text:
          '肩甲骨の内側から1頭で2kg前後しか取れません。中央に葉脈のような筋が走るので、それを外してから厚めのひと口大に切ります。鹿児島産A5のみ。',
        menu: '黒毛和牛 ミスジ 1,980円'
      },
      karubi: {
        en: 'SHORT PLATE',
        name: 'カルビ（トモバラ）',
        text:
          'あばら周り。脂が多いぶん、切り方で重さが決まります。燈火は筋を外して4mmに。たれに漬けず、焼いてから付けていただきます。',
        menu: '燈火カルビ 1,280円'
      },
      harami: {
        en: 'SKIRT',
        name: 'ハラミ',
        text:
          '横隔膜。分類のうえでは内臓ですが、味は赤身そのものです。30日寝かせて水分を抜き、繊維を断つ向きに切っています。',
        menu: '三十日熟成 上ハラミ 1,580円'
      },
      momo: {
        en: 'ROUND',
        name: 'モモ',
        text:
          '脂が少なく、赤身の味が最もはっきり出る部位です。厚めに切って表面だけ焼き、中心を温める程度で止めるのがおすすめです。',
        menu: 'ウチモモ 1,280円 / 赤身の握り 780円'
      }
    };

    var panel = {
      en: document.getElementById('js-cut-en'),
      name: document.getElementById('js-cut-name'),
      text: document.getElementById('js-cut-text'),
      menu: document.getElementById('js-cut-menu')
    };

    var regions = Array.prototype.slice.call(cutFigure.querySelectorAll('.cut__region'));
    var chips = Array.prototype.slice.call(cutChips.querySelectorAll('.cut__chip'));

    function selectCut(key) {
      var data = CUTS[key];
      if (!data) return;

      panel.en.textContent = data.en;
      panel.name.textContent = data.name;
      panel.text.textContent = data.text;
      panel.menu.textContent = data.menu;

      regions.forEach(function (region) {
        var on = region.dataset.cut === key;
        region.classList.toggle('cut__region--active', on);
        region.setAttribute('aria-pressed', String(on));
      });
      chips.forEach(function (chip) {
        chip.classList.toggle('cut__chip--active', chip.dataset.cut === key);
      });
    }

    regions.forEach(function (region) {
      region.addEventListener('click', function () {
        selectCut(region.dataset.cut);
      });
      // SVG の <g> はボタンではないので、キーボード操作を自前で用意する
      region.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        selectCut(region.dataset.cut);
      });
    });

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        selectCut(chip.dataset.cut);
      });
    });

    selectCut('tan');
  }

  /* ------------------------------------------------------
     6. 宴会のお見積り
     ------------------------------------------------------ */
  var sim = document.getElementById('js-sim');

  if (sim) {
    // 料金はコースカード・キャンペーンの記載と同じ値を1か所にまとめている
    var COURSES = {
      tomoshibi: { label: '燈火コース', price: 4800 },
      takumi: { label: '匠コース', price: 6800 },
      kiwami: { label: '極コース', price: 9800 }
    };
    var DRINKS = {
      none: { label: 'つけない', price: 0 },
      min90: { label: '90分', price: 1800 },
      min120: { label: '120分', price: 2300 }
    };
    // 特典03：10名様以上でコース1名分が無料
    var FREE_HOST_FROM = 10;
    // 特典02：4名様以上で乾杯ドリンクが無料
    var FREE_DRINK_FROM = 4;
    // 20名様以上は貸切のご相談を承れる
    var CHARTER_FROM = 20;

    var elGuests = document.getElementById('sim-guests');
    var elCourse = document.getElementById('sim-course');
    var elDrink = document.getElementById('sim-drink');

    var outGuests = document.getElementById('js-sim-guests');
    var outCourseCalc = document.getElementById('js-sim-course-calc');
    var outDrinkCalc = document.getElementById('js-sim-drink-calc');
    var outOffRow = document.getElementById('js-sim-off-row');
    var outOff = document.getElementById('js-sim-off');
    var outTotal = document.getElementById('js-sim-total');
    var outEach = document.getElementById('js-sim-each');
    var outComment = document.getElementById('js-sim-comment');

    function yen(n) {
      return Math.round(n).toLocaleString('ja-JP');
    }

    function updateSim() {
      var guests = parseInt(elGuests.value, 10);
      var course = COURSES[elCourse.value] || COURSES.takumi;
      var drink = DRINKS[elDrink.value] || DRINKS.none;

      var courseSum = course.price * guests;
      var drinkSum = drink.price * guests;
      // 幹事様1名分が無料になるのはコース料金だけ。飲み放題は人数分いただく
      var discount = guests >= FREE_HOST_FROM ? course.price : 0;
      var total = courseSum + drinkSum - discount;
      var each = Math.round(total / guests);

      outGuests.textContent = guests + '名';
      outCourseCalc.textContent = yen(course.price) + '円 × ' + guests + '名';
      outDrinkCalc.textContent =
        drink.price === 0 ? 'なし' : yen(drink.price) + '円 × ' + guests + '名';
      outOff.textContent = '-' + yen(discount) + '円';
      outOffRow.hidden = discount === 0;
      outTotal.textContent = yen(total);
      outEach.textContent = yen(each);

      if (guests < FREE_DRINK_FROM) {
        outComment.textContent =
          'あと' + (FREE_DRINK_FROM - guests) + '名様で、オープン記念の乾杯ドリンク1杯無料が適用されます。';
      } else if (guests < FREE_HOST_FROM) {
        outComment.textContent =
          '乾杯ドリンク1杯無料が適用されます。あと' +
          (FREE_HOST_FROM - guests) +
          '名様で、幹事様1名分（' +
          yen(course.price) +
          '円）が無料になります。';
      } else if (guests < CHARTER_FROM) {
        outComment.textContent =
          '幹事様1名分（' +
          yen(course.price) +
          '円）が無料になりました。乾杯ドリンクも1杯無料です。個室は最大14名様まで、それ以上はテーブルとの併用になります。';
      } else {
        outComment.textContent =
          '20名様以上は店舗貸切としてご相談を承ります。幹事様1名分（' +
          yen(course.price) +
          '円）の無料に加えて、開始時間の繰り上げもご相談ください。';
      }
    }

    sim.addEventListener('input', updateSim);
    sim.addEventListener('change', updateSim);
    updateSim();
  }

  /* ------------------------------------------------------
     7. 料理・ドリンクのタブ
     ------------------------------------------------------ */
  var tabs = document.getElementById('js-tabs');

  if (tabs) {
    var tabBtns = Array.prototype.slice.call(tabs.querySelectorAll('.tabs__btn'));

    function activateTab(index, moveFocus) {
      tabBtns.forEach(function (btn, i) {
        var on = i === index;
        btn.classList.toggle('tabs__btn--active', on);
        btn.setAttribute('aria-selected', String(on));
        // 選択中のタブだけがタブキーの止まり先になる（WAI-ARIA のタブの作法）
        btn.tabIndex = on ? 0 : -1;

        var panel = document.getElementById(btn.getAttribute('aria-controls'));
        if (!panel) return;
        panel.classList.toggle('tabs__panel--active', on);
        panel.hidden = !on;
      });
      if (moveFocus) tabBtns[index].focus();
    }

    tabBtns.forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        activateTab(i, false);
      });
      btn.addEventListener('keydown', function (event) {
        var next = null;
        if (event.key === 'ArrowRight') next = (i + 1) % tabBtns.length;
        if (event.key === 'ArrowLeft') next = (i - 1 + tabBtns.length) % tabBtns.length;
        if (next === null) return;
        event.preventDefault();
        activateTab(next, true);
      });
    });
  }

  /* ------------------------------------------------------
     8. FVの予約ウィジェット → 予約フォーム
     ------------------------------------------------------ */
  var quickDate = document.getElementById('quick-date');
  var formDate = document.getElementById('r-date');

  // 過去の日付を選べないようにする。初期値はオープン日
  var OPEN_DAY = '2026-11-01';
  var today = new Date();
  var todayStr =
    today.getFullYear() +
    '-' +
    String(today.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(today.getDate()).padStart(2, '0');
  var defaultDay = todayStr > OPEN_DAY ? todayStr : OPEN_DAY;

  [quickDate, formDate].forEach(function (input) {
    if (!input) return;
    input.min = todayStr;
    if (!input.value) input.value = defaultDay;
  });

  var quickGo = document.getElementById('js-quick-go');

  if (quickGo) {
    quickGo.addEventListener('click', function () {
      var reserve = document.getElementById('reserve');
      var pairs = [
        ['quick-date', 'r-date'],
        ['quick-time', 'r-time'],
        ['quick-guests', 'r-guests']
      ];

      pairs.forEach(function (pair) {
        var from = document.getElementById(pair[0]);
        var to = document.getElementById(pair[1]);
        if (from && to && from.value) to.value = from.value;
      });

      if (reserve) reserve.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // 入力済みの3項目は飛ばして、最初の未入力欄へ案内する
      var name = document.getElementById('r-name');
      if (name) {
        window.setTimeout(function () {
          name.focus({ preventScroll: true });
        }, 600);
      }
    });
  }

  /* ------------------------------------------------------
     9. AOS
     ------------------------------------------------------ */
  if (typeof AOS === 'undefined') {
    // CDNが読めなかった場合、属性が残ると要素が透明のままになるため取り除く
    document.querySelectorAll('[data-aos]').forEach(function (el) {
      el.removeAttribute('data-aos');
    });
  } else {
    AOS.init({
      duration: 800,
      easing: 'ease-out-cubic',
      once: true,
      offset: 60,
      disable: function () {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      }
    });
  }

  /* ------------------------------------------------------
     10. 予約フォーム
     ------------------------------------------------------ */
  var form = document.getElementById('js-form');

  if (form) {
    var result = document.getElementById('js-form-result');

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.classList.add('was-validated');
        var invalid = form.querySelector(':invalid');
        if (invalid) invalid.focus();
        return;
      }

      // デモサイトのため送信は行わず、完了メッセージのみ表示する
      form.reset();
      form.classList.remove('was-validated');
      if (formDate) formDate.value = defaultDay;

      if (result) {
        result.hidden = false;
        result.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }
})();
