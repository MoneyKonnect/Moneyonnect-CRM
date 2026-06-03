import { Metadata } from "next";
import TrelloClient from "./trello-client";

export const metadata: Metadata = { title: "Trello Board" };

export default function TrelloPage() {
  return <TrelloClient />;
}
