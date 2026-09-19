import { analyseDirections } from "../artifacts/api-server/src/lib/site-generator/engine";
import { validateGeneratedDraft } from "../artifacts/api-server/src/lib/site-generator/validator";

const assert = {
  equal(actual: unknown, expected: unknown, message = "Values are not equal") {
    if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
  },
  ok(value: unknown, message = "Expected value to be truthy") {
    if (!value) throw new Error(message);
  },
};

const base = {
  businessName: "Example Coaching",
  businessType: "Personal trainer",
  mainService: "One-to-one strength coaching",
  audience: "Busy adults returning to training",
  location: "Manchester, UK",
  country: "United Kingdom",
  goal: "Book a consultation",
  bookingLink: "https://example.com/book",
  offer: "A free twenty-minute coaching call",
  differentiator: "Calm coaching with a clear plan built around the client's schedule.",
  sections: ["services", "about", "contact"],
};

const solo = analyseDirections({ brief: base, assetCount: 0, usableImageCount: 0 });
assert.equal(solo.globalBlocks.length, 0);
assert.equal(solo.directions[0]?.id, "guided-personal");
assert.equal(solo.directions[0]?.assetMode, "image-light");

const strengthWithoutPhoto = analyseDirections({ brief: { ...base, businessType: "Strength and performance coach" }, assetCount: 0, usableImageCount: 0 });
assert.ok(!strengthWithoutPhoto.directions.some((direction) => direction.id === "documentary-performance"));

const strengthWithPhoto = analyseDirections({ brief: { ...base, businessType: "Strength and performance coach" }, assetCount: 1, usableImageCount: 1 });
assert.ok(strengthWithPhoto.directions.some((direction) => direction.id === "documentary-performance"));

const studioWithoutSchedule = analyseDirections({ brief: { ...base, businessType: "Pilates studio", goal: "Fill classes" }, assetCount: 0, usableImageCount: 0 });
assert.ok(!studioWithoutSchedule.directions.some((direction) => direction.id === "community-schedule"));

const studioWithSchedule = analyseDirections({ brief: { ...base, businessType: "Pilates studio", goal: "Fill classes", schedule: "Monday 18:00 and Wednesday 09:30" }, assetCount: 0, usableImageCount: 0 });
assert.ok(studioWithSchedule.directions.some((direction) => direction.id === "community-schedule"));

const multi = analyseDirections({ brief: { ...base, businessScale: "Multiple locations", locationCount: "4" }, assetCount: 0, usableImageCount: 0 });
assert.ok(multi.directions.every((direction) => direction.scaleMode === "multi-location"));
assert.ok(multi.directions.some((direction) => direction.warnings.some((warning) => warning.includes("Extra Pages"))));

const countries = ["United Kingdom", "United States", "Canada", "Australia", "New Zealand"];
const businessTypes = [
  "Personal trainer",
  "Online fitness coach",
  "Pilates instructor",
  "Yoga studio",
  "Bootcamp coach",
  "Premium private trainer",
  "Strength and performance coach",
  "Rehabilitation specialist",
  "Small gym",
  "Older adult fitness coach",
];

let caseCount = 0;
for (const country of countries) {
  for (const businessType of businessTypes) {
    for (const variant of [0, 1]) {
      const classLed = /pilates|yoga|bootcamp|gym/i.test(businessType);
      const specialist = /rehabilitation/i.test(businessType);
      const context = {
        brief: {
          ...base,
          country,
          businessType,
          goal: classLed ? "Fill classes" : "Book a consultation",
          schedule: classLed ? "Monday 18:00; Saturday 09:00" : "",
          credentials: specialist ? "Registered rehabilitation specialist" : "",
          businessScale: variant ? "Team at one location" : "Solo operator",
          contentLength: variant ? "Standard" : "Auto",
        },
        assetCount: variant ? 5 : 0,
        usableImageCount: variant ? 5 : 0,
      };
      const result = analyseDirections(context);
      assert.equal(result.globalBlocks.length, 0, `${businessType} in ${country} should have a complete core brief`);
      assert.ok(result.directions.length > 0, `${businessType} in ${country} should receive at least one eligible direction`);
      assert.ok(result.directions.length <= 3);
      caseCount++;
    }
  }
}
assert.equal(caseCount, 100);

const unsafeDraft = {
  copy: {
    headline: "Build strength with expert coaching",
    subheadline: "One-to-one coaching for busy adults in Manchester who want a clear way back into training.",
    about: "We have helped 500 clients achieve a 40% improvement.",
    button: "Book a consultation",
  },
  sections: [
    { id: "services", eyebrow: "Coaching", title: "A plan for your week", body: "Personal coaching shaped around your experience, schedule and current training routine.", layout: "editorial" as const, highlights: [] },
    { id: "about", eyebrow: "About", title: "A calm coaching approach", body: "Clear guidance and practical support help you build a routine you can keep using.", layout: "editorial" as const, highlights: [] },
    { id: "contact", eyebrow: "Next step", title: "Talk through your goals", body: "Book a short conversation to decide whether the coaching is suitable for you.", layout: "statement" as const, highlights: [] },
  ],
};
const validation = validateGeneratedDraft(base, unsafeDraft);
assert.ok(validation.some((issue) => issue.code === "unsupported-result" && issue.severity === "error"));

console.log(`Site generator smoke test passed: ${caseCount} adversarial selection cases plus delivery validation.`);
