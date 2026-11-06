import React from "react";
import { VoucherForm } from "../components/VoucherForm";

export default function PaymentVoucherPage() {
  return <VoucherForm voucherType="payment" onSaved={() => {}} />;
}