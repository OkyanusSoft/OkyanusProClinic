import React, { useMemo } from "react";
import { useStore, useMoney } from "../store";
import { IconWallet } from "../icons";
import { EmptyState } from "../components/ui";

export default function CashBoxesPage() {
  const { db } = useStore();
  const money = useMoney();
  const posted = db.vouchers.filter((v) => v.status === "posted");
  const boxes = useMemo(() => db.accounts.filter((a) => a.isPosting && a.code.startsWith("111")), [db.accounts]);
  return (
    <div className="space-y-5">
      <div className="anim-rise">
        <h1 className="font-display font-bold text-3xl text-ink">بيانات الصناديق</h1>
        <p className="text-sm text-soft mt-1">الحسابات النقدية/البنكية (مستوى 5) و أرصدتها</p>
      </div>
      {boxes.length === 0 ? (
        <EmptyState icon={<IconWallet className="w-6 h-6" />} title="لا صناديق" desc="أضف حسابات نقد/بنك في دليل الحسابات (رمز 111xxx)." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-mist/70 border-b border-line"><tr><th className="th">الرمز</th><th className="th">الاسم</th><th className="th">الرصيد</th></tr></thead>
            <tbody>
              {boxes.map((a) => {
                const bal = posted.reduce((s, v) => s + v.lines.reduce((ss, l) => l.accountId === a.id ? ss + (l.debit - l.credit) : ss, 0), 0);
                return (
                  <tr key={a.id} className="border-b border-line/60">
                    <td className="td stat-num">{a.code}</td>
                    <td className="td font-bold">{a.name}</td>
                    <td className="td stat-num font-bold">{money(bal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
