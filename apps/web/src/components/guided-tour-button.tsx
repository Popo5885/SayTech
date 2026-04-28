"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { driver, type DriveStep } from "driver.js";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const TOUR_STEPS = [
  {
    title: "ברוכים הבאים ל-Magic Flow",
    description: "המערכת כבר מכינה עבורך את כל התשתית. הסיור הזה יעבור על הדברים החשובים בדקה אחת."
  },
  {
    selector: "[data-tour='connection-status']",
    title: "סטטוס החיבור",
    description: "כאן רואים שהמספר שלך מוכן ושהבוט יכול לקבל משתתפים. אין צורך לסרוק QR או לבצע פעולה טכנית."
  },
  {
    selector: "[data-tour='join-link']",
    title: "קישור ההצטרפות",
    description: "זה הקישור שמפרסמים ללקוחות. כל מי שנכנס מתחיל שיחת WhatsApp עם הבוט שלך."
  },
  {
    selector: "[data-tour='messages-nav']",
    title: "הודעות",
    description: "כאן עורכים את תסריט השיחה של הבוט בצורה פשוטה ונקייה."
  },
  {
    selector: "[data-tour='smart-variable']",
    title: "משתנים חכמים",
    description: "כפתור המשתנים מוסיף שם, קישור או כמות כרטיסים בלי לכתוב קוד."
  },
  {
    selector: "[data-tour='status-task']",
    title: "משימת סטטוס",
    description: "כאן מגדירים בקשת צילום מסך, כדי לתת כרטיס רק אחרי הוכחת שיתוף."
  },
  {
    selector: "[data-tour='bot-simulator']",
    title: "סימולטור חי",
    description: "הטלפון המדומה מראה איך ההודעות ייראו אצל המשתתף."
  },
  {
    selector: "[data-tour='flash']",
    title: "מבצע בזק",
    description: "מכאן אפשר להפעיל קמפיין קצר של 60 דקות, כשהתוסף פעיל בחשבון."
  },
  {
    selector: "[data-tour='google-sync']",
    title: "סנכרון Google",
    description: "אחרי חיבור Google, משתתפים נשמרים באנשי הקשר בצורה מסודרת וללא כפילויות."
  },
  {
    selector: "[data-tour='privacy']",
    title: "תקנון ופרטיות",
    description: "המערכת נותנת בסיס תקנון מקצועי לכל קמפיין, כדי שהלקוח לא יתחיל מאפס."
  },
  {
    selector: "[data-tour='analytics-nav']",
    title: "הגרלה ודוחות",
    description: "כאן רואים נתונים אמיתיים בלבד ומבצעים הגרלה עם תיעוד מסודר."
  },
  {
    title: "זהו, הקסם מתחיל",
    description: "המערכת מוכנה לעבודה. צוות Magic Flow כאן לכל שאלה דרך מרכז העזרה."
  }
] as const;

async function saveTourStep(step: number, completed = false) {
  try {
    await fetch("/api/onboarding-tour", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ step, completed })
    });
  } catch {
    // The tour should continue even if progress persistence is temporarily unavailable.
  }
}

async function getSavedStep() {
  try {
    const response = await fetch("/api/onboarding-tour", { cache: "no-store" });

    if (!response.ok) {
      return 0;
    }

    const state = (await response.json()) as {
      onboardingTourCompletedAt?: string | null;
      onboardingTourStep?: number;
    };

    if (state.onboardingTourCompletedAt) {
      return null;
    }

    return Math.max(0, Math.min(11, Number(state.onboardingTourStep ?? 0)));
  } catch {
    return 0;
  }
}

function buildDriveSteps(): DriveStep[] {
  return TOUR_STEPS.map((step) => {
    const element =
      "selector" in step && typeof document !== "undefined"
        ? document.querySelector(step.selector) ?? undefined
        : undefined;

    return {
      ...(element ? { element } : {}),
      popover: {
        title: step.title,
        description: step.description,
        side: "bottom",
        align: "center"
      }
    };
  });
}

export function GuidedTourButton({
  autoStart = false,
  showButton = true
}: {
  autoStart?: boolean;
  showButton?: boolean;
}) {
  const [showConfetti, setShowConfetti] = useState(false);
  const autoStartedRef = useRef(false);
  const particles = useMemo(() => Array.from({ length: 36 }, (_, index) => index), []);

  async function startTour() {
    await fetch("/api/onboarding-tour", { method: "POST" }).catch(() => null);
    const savedStep = await getSavedStep();

    if (savedStep === null) {
      return;
    }

    const steps = buildDriveSteps();

    const tour = driver({
      steps,
      animate: true,
      smoothScroll: true,
      overlayColor: "#020617",
      overlayOpacity: 0.72,
      stagePadding: 10,
      stageRadius: 18,
      showProgress: true,
      allowClose: true,
      popoverClass: "magic-flow-driver-popover",
      progressText: "{{current}} מתוך {{total}}",
      nextBtnText: "הבא",
      prevBtnText: "חזור",
      doneBtnText: "סיום",
      onHighlighted: (_element, _step, opts) => {
        const index = opts.driver.getActiveIndex() ?? 0;
        void saveTourStep(index + 1);
      },
      onNextClick: (_element, _step, opts) => {
        if (opts.driver.isLastStep()) {
          void saveTourStep(12, true);
          opts.driver.destroy();
          setShowConfetti(true);
          window.setTimeout(() => setShowConfetti(false), 2200);
          return;
        }

        opts.driver.moveNext();
      },
      onPrevClick: (_element, _step, opts) => opts.driver.movePrevious(),
      onCloseClick: (_element, _step, opts) => opts.driver.destroy()
    });

    tour.drive(savedStep >= steps.length - 1 ? 0 : savedStep);
  }

  useEffect(() => {
    if (!autoStart || autoStartedRef.current) {
      return;
    }

    autoStartedRef.current = true;
    const timer = window.setTimeout(() => {
      void startTour();
    }, 800);

    return () => window.clearTimeout(timer);
  }, [autoStart]);

  return (
    <>
      {showButton ? (
        <button
          className="inline-flex h-10 items-center gap-2 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 text-sm font-black text-cyan-800 transition hover:bg-cyan-100"
          onClick={startTour}
          type="button"
        >
          <Sparkles className="h-4 w-4" />
          התחל סיור
        </button>
      ) : null}

      <AnimatePresence>
        {showConfetti ? (
          <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
            {particles.map((particle) => (
              <motion.span
                animate={{
                  opacity: [0, 1, 0],
                  y: ["0vh", `${70 + (particle % 4) * 8}vh`],
                  rotate: [0, 180 + particle * 13]
                }}
                className="absolute top-12 h-3 w-3 rounded-full"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0, y: "-6vh", rotate: 0 }}
                key={particle}
                style={{
                  right: `${(particle * 37) % 100}%`,
                  background:
                    particle % 3 === 0 ? "#10b981" : particle % 3 === 1 ? "#06b6d4" : "#8b5cf6"
                }}
                transition={{ duration: 1.7, delay: (particle % 8) * 0.04, ease: "easeOut" }}
              />
            ))}
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
