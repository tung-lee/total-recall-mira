# Devpost submission: Mira

## Tagline

Text one selfie. Mira reads your skin, tries the right products on your face and body, and finds the best price, all inside iMessage.

## Inspiration

Nobody wonders about their skin in the abstract. It happens in a store aisle, after a breakout, or with a cart open at midnight. In that moment shoppers guess: a quiz instead of a measurement, a model's face instead of their own, the first store instead of the cheapest one. AI shopping assistants that live in your messages (you text them a product and they compare it for you) showed us the right surface. We asked what happens when that assistant can actually see you.

## What it does

Mira is an AI beauty and style assistant that lives in an iMessage thread.

1. **Skin read from one selfie.** YouCam AI Skin Analysis scores eight concerns (breakouts, redness, oiliness, pores, texture, fine lines, hydration, dark circles), estimates skin age, and returns heat map masks that Mira shows inline.
2. **Picks matched to the measurement.** Mira takes your three weakest scores and recommends one product per concern, with review pills (good, mixed, bad), number of sources and the reason it fits your skin. Fragrance and heavy textures are skipped when your profile says so.
3. **Best price, automatically.** Every pick is checked across three stores and the cheaper verified seller is shown with the amount saved.
4. **Tried on before you ask.** Without being prompted, the agent chooses a lip shade based on your redness score and renders it on your face with YouCam Makeup VTO, shown as a draggable before and after.
5. **The full look.** Ask for an outfit and Mira dresses your full body photo with YouCam AI Clothes, then pairs it with the shade you just tried.
6. **It learns.** Skin type, focus concerns, shade, money saved and score history are remembered on the device, so the next chat starts from what Mira already knows.

## How we built it

1. **Frontend:** React and Vite, a pixel faithful iMessage thread (bubbles with tails, typing indicator, photo sheet, rich cards), responsive from a full screen iPhone web app to a phone frame on desktop.
2. **Agent:** a client side planner (`useMira`) turns each message or photo into a chain of tool calls and streams a live step trace into the thread, so the user watches the agent work: read photo, Skin AI, match, price check, Makeup VTO.
3. **Backend:** a dependency free Node server that keeps the YouCam key secret and implements the v2 flow for all three features: register file, PUT bytes to the presigned URL, create task, poll until success, and normalise the result shapes.
4. **YouCam APIs used:** AI Skin Analysis (`skin-analysis`, 8 SD concerns, JSON output with mask overlays), Makeup VTO (`makeup-vto`, `lip_color` effects with matte, satin and gloss textures), AI Clothes (`cloth-v4` with fallback to `cloth`).

## Challenges

Each YouCam feature has its own input window (minimum short side for skin, maximum long side for makeup, full body pose for clothes), so the client re-encodes every photo to fit the feature it is about to call, and the server maps YouCam error codes (face too small, lighting too dark, pose) to friendly, actionable replies instead of a generic failure.

The most common rejection is a selfie taken at arm's length (YouCam needs the face to cover over 60% of the image width), so the agent heals itself: it zooms toward the face and retries once, and the step trace says so, before it ever asks the user for another photo.

## What we learned

The best moment to use Skin AI is the moment right before a purchase, and the best way to sell a try-on is not to ask for permission: when the agent already has your face and your scores, showing the result unprompted turns a feature into a conversation.

## What's next

A real catalog and price feed, YouCam Skin Tone analysis to pick foundation and undertone aware shades, weekly check in scans that track whether a product is working, and a native iMessage relay so the same agent answers texts sent to a phone number.

## Try it

Clone the repo, add a `YOUCAM_API_KEY` to `.env`, then `npm --prefix web install && npm run build && npm start` and open `http://localhost:8787`. Live app: https://mira-production-110e.up.railway.app. All three features were verified against the live YouCam API; the demo video was recorded in demo mode because the trial units ran out while filming. Without a key the app still runs in a clearly labelled demo mode (mock skin scores, local lip tint preview on the bundled demo selfie, garment reference preview). On an iPhone, open the page in Safari and add it to the home screen for the full screen iMessage feel.

## Built with

YouCam API (AI Skin Analysis, Makeup VTO, AI Clothes), React, TypeScript, Vite, Node.js, Playwright (demo recording).
