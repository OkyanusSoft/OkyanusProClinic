import React from "react";
import { IconSpark } from "../icons";
import { EmptyState } from "../components/ui";

export default function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="space-y-5">
      <h1 className="font-display font-bold text-3xl text-ink">{title}</h1>
      <div className="card p-10">
        <EmptyState icon={<IconSpark className="w-6 h-6" />} title="قيد التطوير" desc="هذه الشاشة قيد البناء ضمن المراحل التالية. سيتم تفعيلها قريباً." />
      </div>
    </div>
  );
}
