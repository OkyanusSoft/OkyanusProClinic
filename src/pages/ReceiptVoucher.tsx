import React from "react";
import { VoucherForm } from "../components/VoucherForm";

export default function ReceiptVoucherPage() {
  return <VoucherForm voucherType="receipt" onSaved={() => {}} />;
}