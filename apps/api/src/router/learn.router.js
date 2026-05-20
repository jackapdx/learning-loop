import { loggedProcedure, router } from "../lib/trpc.js";
import { listLessons, loadLesson } from "../services/lesson-parser.js";
export const learnRouter = router({
    /** List all lessons grouped by section */
    list: loggedProcedure.query(() => {
        const sections = listLessons();
        const totalLessons = sections.reduce((sum, s) => sum + s.lessons.length, 0);
        return {
            overview: {
                title: "System Design & Infrastructure Learn",
                subtitle: `${totalLessons} บทเรียน — System Design + Chat + PostgreSQL`,
                description: "คอร์สเรียนแบบ Interactive ตามหลัก Learning Loop — ปฐมนิเทศ → ลองทำ → ผลตอบรับ → คำอธิบาย → ขยายความ → จุดตรวจสอบ → สะท้อนคิด",
                totalLessons,
            },
            sections: sections.map((section) => ({
                section: section.section,
                label: section.label,
                lessons: section.lessons,
            })),
        };
    }),
    /** Get a single lesson */
    get: loggedProcedure
        .input((input) => {
        if (typeof input === "object" &&
            input !== null &&
            "slug" in input &&
            typeof input.slug === "string")
            return input;
        throw new Error("Invalid input");
    })
        .query(({ input }) => {
        const lesson = loadLesson(input.slug);
        if (!lesson)
            throw new Error(`Lesson not found: ${input.slug}`);
        // Strip checkpoint answers (revealed via separate endpoint)
        const safeSections = lesson.sections.map((s) => {
            if (s.type === "checkpoint") {
                const { checkpointAnswer, ...rest } = s;
                return { ...rest, checkpointAnswer: null };
            }
            return s;
        });
        return { ...lesson, sections: safeSections };
    }),
    /** Reveal checkpoint answer */
    revealAnswer: loggedProcedure
        .input((input) => {
        if (typeof input === "object" &&
            input !== null &&
            "slug" in input &&
            "sectionIndex" in input &&
            typeof input.slug === "string" &&
            typeof input.sectionIndex === "number")
            return input;
        throw new Error("Invalid input");
    })
        .query(({ input }) => {
        const lesson = loadLesson(input.slug);
        if (!lesson)
            throw new Error("Lesson not found");
        const section = lesson.sections[input.sectionIndex];
        if (!section || section.type !== "checkpoint")
            throw new Error("Not a checkpoint");
        return { answer: section.checkpointAnswer || null };
    }),
});
