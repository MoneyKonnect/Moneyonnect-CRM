import { Metadata } from "next";
import { BirthdayCalendarClient } from "@/components/intelligence/birthday-calendar";

export const metadata: Metadata = { title: "Birthday Calendar" };

export default function BirthdaysPage() {
  return (
    <div className="p-6 max-w-[1200px]">
      <BirthdayCalendarClient />
    </div>
  );
}
