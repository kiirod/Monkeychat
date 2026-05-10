"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function UserDMRedirect() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  useEffect(() => {
    if (username) {
      router.replace(`/?dm=${encodeURIComponent(username)}`);
    } else {
      router.replace("/");
    }
  }, [username, router]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#323437", fontFamily: "var(--font-roboto-mono), monospace" }}>
      <div style={{ color: "#646669", fontSize: 14 }}>Opening conversation...</div>
    </div>
  );
}
