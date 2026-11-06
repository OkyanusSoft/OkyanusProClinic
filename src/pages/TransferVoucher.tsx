import React from "react";
import { VoucherForm } from "../components/VoucherForm";

export default function TransferVoucherPage() {
  return <VoucherForm voucherType="transfer" onSaved={() => {}} />;
}