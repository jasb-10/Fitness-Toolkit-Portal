# Fitness Toolkit website generator: production specification

## Product boundary

The core purchase creates one complete, responsive, single-page website. It is a
finished page with navigation, conversion path, SEO metadata, mobile behaviour,
customer-approved copy and portable assets. It is not hosting and it is not a
subscription.

The Extra Pages entitlement expands the approved single page into a connected
multi-page website. The homepage remains useful by itself. Extra Pages may add
up to four pages from About, Services or Classes, Contact or Location, and one
business-specific page. Dedicated location pages belong to Extra Pages because
multi-location is an information architecture change, not a colour or layout
choice.

## Non-negotiable generation model

The language model never writes the website code. It returns one compact,
validated JSON content plan. The application selects an eligible composition,
renders trusted components, packages the assets and validates the result.

```
customer truth
  -> completeness and contradiction checks
  -> eligible compositions
  -> three visual directions
  -> customer choice
  -> structured copy generation
  -> deterministic component renderer
  -> delivery validator
  -> customer review and targeted edits
  -> approval and download
```

Changing a palette, type direction, spacing, section order or image crop must
not call AI. Manual edits must not call AI. A targeted rewrite calls AI once for
the selected field. A complete alternative draft consumes the second included
generation.

## Modes

Each result combines independent modes. These are not templates.

### Content length

- Compact: four or five purposeful sections for a thin brief.
- Standard: six to eight sections for a normal local business.
- Expanded: nine to twelve sections only when the customer supplied enough
  real services, proof, questions, images or schedule information.

### Assets

- Image-light: typography, colour, rules, cards and diagrams carry the design.
- Image-led: one to three usable customer images.
- Image-rich: a genuine image library with enough variety for galleries and
  alternating editorial modules.

### Business scale

- Solo.
- Team or single venue.
- Multi-location overview. Dedicated location pages require Extra Pages.

### Conversion route

- Book or enquire.
- Join or fill a class.
- Apply for coaching.
- Buy a defined programme.
- Join a waitlist.
- Establish professional credibility with a clear contact route.

## Constraint-based composition selection

Every composition declares its required facts and assets. A composition is not
shown when the customer cannot fill it honestly.

Examples:

- A direct-purchase campaign needs a real programme, price, start date and
  purchase destination.
- A waitlist campaign needs the programme and waitlist destination, but does
  not need a public price.
- An image-rich editorial composition needs at least four usable photographs.
- A documentary performance composition needs a genuine coach or venue image.
- A live-capacity schedule needs a real integration. Without one, the system
  may show a clearly static schedule only.
- A precision or clinical composition may show credentials and measured
  results only when the source fields exist.

Selection is scored only after eligibility. Niche, audience, conversion route,
business scale, asset quality and stated visual preferences determine rank.
The user sees three genuinely different eligible directions. A direction
changes the whole page grammar, not only the hero.

## Intake

The intake is staged and conditional so it can be thorough without showing one
enormous form.

1. Business: name, business type, country or locale, location, delivery model,
   team size and number of locations.
2. Customer and offer: ideal customer, main service, real service options,
   differentiator and primary action.
3. Operational detail: booking destination, schedule or programme details,
   prices only if the customer wants them displayed, contact details and opening
   hours when relevant.
4. Proof: approved testimonials, qualifications, attributable results and
   transformation images with consent.
5. Assets: logo, photographs, existing website, brand colours and image rights.
6. Taste: two useful preference choices plus an optional reference URL. The
   customer chooses among eligible compositions after this, so taste never
   overrides missing content.

Thin answers trigger a compact composition or follow-up questions. They never
create a long empty page. Contradictory answers block generation and present a
plain-language choice. Unsupported claims are omitted.

## Content provenance

Every factual generated block records:

- the source intake field or fields;
- the claim type;
- whether it is customer verified;
- whether exact wording must be preserved.

The model can improve structure and wording. It cannot introduce a location,
price, date, capacity, qualification, testimonial, statistic, result,
guarantee or scarcity claim that is not traceable to supplied data.

## Included usage

The recommended allowance for the core purchase is:

- one complete content generation;
- three no-cost eligible design previews;
- one alternative eligible composition;
- five targeted assisted copy edits;
- unlimited manual edits and no-cost design controls;
- no generated photography by default.

The current application allowance may remain temporarily higher while the
vertical slice is tested. The durable limit must be enforced by the server, not
the browser. A customer-supplied API key can be an advanced later option, not a
requirement for ordinary buyers.

## Image rules

The portal classifies uploaded assets by orientation and intended role. The
customer confirms usage rights. It never silently places a poor portrait in a
wide hero crop.

- Zero useful images selects an image-light composition.
- One useful image can support a hero or an about block, not a gallery.
- Four or more varied images can unlock image-rich compositions.
- AI image generation is optional, clearly labelled, and never fabricates the
  customer's body, facilities, clients, transformations or credentials.
- Uploaded client images require the customer's confirmation that publication
  consent exists.

## Delivery validator

Approval and download are blocked when any hard failure exists:

- placeholder text or generator commentary;
- an unsupported factual claim or number;
- a required section below its content minimum;
- a dead, fake or unsafe action;
- a fake form, schedule capacity or booking control;
- missing contact destination;
- more or fewer than one H1;
- invalid locale, canonical, Open Graph or structured data;
- missing content-image alt text;
- horizontal overflow at 390 pixels;
- missing focus states or inadequate body-text contrast;
- an image-rich result without enough approved images.

Warnings do not block delivery. They cover generic copy, weak images, repetitive
sections, overlong prose, visual imbalance and optional missing proof.

## Adversarial acceptance set

The generator is not accepted because it succeeds on polished demo briefs. It
must be exercised against at least 100 cases distributed across solo trainers,
online coaches, yoga and Pilates, group classes, premium wellness, performance,
small gyms, specialist audiences and multi-location operators in the UK, US,
Canada, Australia and New Zealand.

The cases deliberately include no assets, poor assets, one useful image, large
libraries, thin answers, contradictory answers, risky claims, unusual niches,
long business names, long locations, missing prices and picky visual choices.

Launch criteria are zero embarrassing failures: no fabrication, empty modules,
meta-commentary, broken mobile layout, fake controls or unsafe links. Some
outputs may be less inspired than others; none may be misleading or broken.

## Build sequence

1. Implement the shared intake schema, composition catalogue, eligibility
   engine and validator.
2. Complete one vertical slice using the guided personal composition in compact
   and standard modes, including preview, generation, editing, approval and
   download.
3. Run adversarial cases and correct the mechanism rather than patching a single
   example.
4. Add the remaining visual families one at a time behind the same schema and
   validator.
5. Add the Extra Pages renderer only after the one-page path is reliable.

