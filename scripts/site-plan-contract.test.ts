import assert from "node:assert/strict";
import {
  adaptLegacyProject,
  digitalMomentumFamily,
  documentaryPerformanceFamily,
  precisionPracticeFamily,
  editorialStudioFamily,
  headlineFitFor,
  isSitePlanV1,
  moduleRegistry,
  SITE_PLAN_VERSION,
} from "../lib/site-plan/src/index.js";

const legacy = adaptLegacyProject({
  briefData: { audience: "Women returning to movement", goal: "Book a consultation" },
  styleData: {
    compositionId: "editorial-studio",
    lengthMode: "expanded",
    assetMode: "image-rich",
    brandColour: "#7b5b4b",
    copy: { headline: "Thoughtful reformer Pilates for strength that lasts", button: "Book a consultation" },
  },
  sections: [{ id: "services", title: "Ways to move", body: "Private and small-group reformer sessions." }],
});

assert.equal(legacy.schemaVersion, SITE_PLAN_VERSION);
assert.equal(legacy.familyId, "editorial-studio");
assert.equal(legacy.contentMode, "expanded");
assert.equal(legacy.assetMode, "multiple");
assert.equal(legacy.modules[0]?.id, "services");
assert.equal(isSitePlanV1(legacy), true);
assert.equal(adaptLegacyProject({ styleData: { sitePlan: legacy } }), legacy);
assert.equal(headlineFitFor("A".repeat(80)), "compact");
assert.deepEqual(editorialStudioFamily.supportedAssetModes, ["none", "single", "multiple"]);
assert.deepEqual(digitalMomentumFamily.heroVariants, ["track", "dashboard", "image-signal"]);
assert.deepEqual(digitalMomentumFamily.supportedContentModes, ["compact", "standard", "expanded"]);
assert.deepEqual(documentaryPerformanceFamily.heroVariants, ["dossier", "full-bleed", "sequence"]);
assert.deepEqual(documentaryPerformanceFamily.supportedAssetModes, ["single", "multiple"]);
assert.deepEqual(precisionPracticeFamily.heroVariants, ["assessment", "practitioner", "pathway"]);
assert.deepEqual(precisionPracticeFamily.supportedAssetModes, ["none", "single", "multiple"]);
assert.ok(moduleRegistry.services && moduleRegistry.approach && moduleRegistry.contact);

console.log("SitePlan contract checks passed");
