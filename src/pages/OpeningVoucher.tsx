import React from "react";
import { VoucherForm } from "../components/VoucherForm";

export default function OpeningVoucherPage() {
  return <VoucherForm voucherType="opening" onSaved={() => {}} />;
}