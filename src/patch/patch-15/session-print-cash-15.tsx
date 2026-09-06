/* =====================================================================
   الحزمة الخامسة عشرة — Session.tsx + PrintSheet.tsx + Invoices.tsx
   ---------------------------------------------------------------------
   نفّذ المقاطع (د) ثم (هـ) ثم (و).
   ===================================================================== */

/* ============================================================
   (د) src/pages/Session.tsx — احسب الخصم النقدي ومرّره إلى END_SESSION
       ابحث عن دالة end() أو المكان الذي يُستدعى فيه:
          dispatch({ type: "END_SESSION", ... })
       ستجد شيئًا مثل:
   ============================================================ */

/*
  const end = () => {
    ...
    dispatch({ type: "END_SESSION", id: session.id, paid: paidNum, fuId });
    ...
  };
*/

/*       واستبدل سطر الـ dispatch بهذا (مع حساب cashDiscount قبله): */

/*
  // ★ الخصم النقدي = الفرق بين المحسوب من الإجراءات والإجمالي المرن الذي حدده الدكتور
  const calcTotal = session.procedures.reduce(
    (s, pr) => s + pr.price * Math.max(1, pr.teeth.length),
    0
  );
  const cashDiscount = Math.max(0, calcTotal - total); // total = الإجمالي المرن

  dispatch({ type: "END_SESSION", id: session.id, paid: paidNum, fuId, cashDiscount });
*/

/* ============================================================
   ملاحظة:
   - `total` هنا هو متغير الإجمالي المرن (الذي يعدّله الدكتور في شريط الخروج).
     إن كان اسمه لديك مختلفًا (مثل finalTotal أو overrideTotal) استخدم اسمك.
   - إذا كان calcTotal محسوبًا أصلًا في المكوّن باسم آخر، استخدم الموجود ولا تحسبه مرتين.
   ============================================================ */

/* ============================================================
   (هـ) src/components/PrintSheet.tsx — سطر «خصم نقدي» في طباعة الفاتورة
       ابحث في مكوّن InvoicePrint عن كتلة ملخص المبالغ، ستجد شيئًا مثل:
   ============================================================ */

/*
          <div className="flex justify-between"><span className="text-soft">الإجمالي قبل الخصم:</span><b className="stat-num">{money(total / (1 - inv.discount / 100))}</b></div>
          <div className="flex justify-between text-[#a06410]"><span>الخصم ({inv.discount}%):</span><b className="stat-num">− {money(total / (1 - inv.discount / 100) - total)}</b></div>
        </>
      ) : null}
      <div className="flex justify-between"><span className="text-soft">الإجمالي المستحق:</span><b className="stat-num">{money(total)}</b></div>
      <div className="flex justify-between text-mint"><span>المدفوع:</span><b className="stat-num">{money(inv.paid)}</b></div>
*/

/*       واستبدلها بهذا (يضيف سطر الخصم النقدي ويحدّث البقية): */

/*
          <div className="flex justify-between"><span className="text-soft">الإجمالي قبل الخصم:</span><b className="stat-num">{money(gross)}</b></div>
          {inv.discount ? (
            <div className="flex justify-between text-[#a06410]"><span>الخصم ({inv.discount}%):</span><b className="stat-num">− {money(gross - gross * (1 - inv.discount / 100))}</b></div>
          ) : null}
          {inv.cashDiscount ? (
            <div className="flex justify-between text-[#a06410]"><span>خصم نقدي:</span><b className="stat-num">− {money(inv.cashDiscount)}</b></div>
          ) : null}
        </>
      ) : (
        <div className="flex justify-between"><span className="text-soft">الإجمالي:</span><b className="stat-num">{money(gross)}</b></div>
      )}
      <div className="flex justify-between border-t border-line pt-1.5"><span className="font-bold">الإجمالي المستحق:</span><b className="stat-num">{money(total)}</b></div>
      <div className="flex justify-between text-mint"><span>المدفوع:</span><b className="stat-num">{money(inv.paid)}</b></div>
*/

/* ============================================================
   ملاحظة — تأكد من تعريف `gross` و `total` أعلى المكوّن:
       const gross = inv.items.reduce((s, i) => s + i.qty * i.price, 0);
       const total = invoiceTotal(inv);   // ← يشمل الخصم النقدي تلقائيًا
   (غالبًا `total` معرّف أصلًا عبر invoiceTotal، فأضف `gross` فقط إن لم يوجد.)
   المدفوع والمتبقي يُحسبان عبر total فيتحدّثان تلقائيًا.
   ============================================================ */

/* ============================================================
   (و) src/pages/Invoices.tsx — شارة «خصم نقدي» في الجدول (اختياري/مستحسن)
       ابحث عن صف الفاتورة في الجدول، وتحديدًا الخلية التي تعرض الإجمالي،
       ستجد شيئًا مثل:
   ============================================================ */

/*
  <td className="td"><span className="stat-num font-bold">{money(invoiceTotal(inv))}</span></td>
*/

/*       واستبدله بهذا (يضيف شارة الخصم النقدي تحت الإجمالي): */

/*
  <td className="td">
    <span className="stat-num font-bold">{money(invoiceTotal(inv))}</span>
    {inv.cashDiscount ? (
      <span className="chip bg-amber-soft text-[#a06410] !text-[9px] mt-1 block w-fit">
        خصم نقدي −{money(inv.cashDiscount)}
      </span>
    ) : null}
  </td>
*/
