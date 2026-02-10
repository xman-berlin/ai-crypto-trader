"use client";

import { useState } from "react";

export default function Accordion({
  items,
}: {
  items: { title: string; content: React.ReactNode }[];
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] overflow-hidden">
      {items.map((item, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div key={idx}>
            {idx > 0 && <div className="border-t border-[var(--card-border)]" />}
            <button
              onClick={() => setOpenIndex(isOpen ? null : idx)}
              className="flex w-full cursor-pointer items-center justify-between px-6 py-4 text-left hover:bg-[var(--background)] transition-colors"
            >
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <span
                className="text-[var(--muted)] transition-transform duration-200"
                style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}
              >
                +
              </span>
            </button>
            <div
              className="grid transition-[grid-template-rows] duration-300 ease-in-out"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <div className="px-6 pb-6">{item.content}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
