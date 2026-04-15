import { type Metadata } from "next";
import { Retrospect } from "@/components/retrospect";

export const metadata: Metadata = {
  title: "Retrospect",
};

const RetrospectPage = () => {
  return <Retrospect />;
};

export default RetrospectPage;
