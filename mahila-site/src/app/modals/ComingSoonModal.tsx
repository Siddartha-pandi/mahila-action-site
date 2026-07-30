"use client";

import { useEffect, useState } from "react";
import { registerComingSoonModal } from "@/lib/comingSoon";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Button } from "../components/ui/Button";

export function ComingSoonModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    registerComingSoonModal(() => setOpen(true));
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="bg-[#f4efe7] border-none max-w-[420px] text-center sm:text-center">
        <DialogHeader className="items-center text-center sm:text-center">
          <div className="text-[40px] leading-none mb-1">🚧</div>
          <DialogTitle
            className="font-['Fraunces',serif] text-[#1e1e1e] text-[24px]"
            style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
          >
            We're upgrading our systems
          </DialogTitle>
          <DialogDescription className="font-['Inter',sans-serif] text-[#1e1e1e]/70 text-[15px] leading-relaxed">
            This feature will be back soon. Thanks for sitting tight!
          </DialogDescription>
        </DialogHeader>
        <Button onClick={() => setOpen(false)} className="w-full mt-2" size="lg">
          Got it
        </Button>
      </DialogContent>
    </Dialog>
  );
}
