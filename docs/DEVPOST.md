## Inspiration

Nobody wonders about their skin in the abstract. It happens in a store aisle holding two serums, the morning after a breakout, or at midnight with a cart open and no idea whether that lipstick will look anything like it did on the model. In that moment shoppers guess. They take a quiz instead of a measurement, they buy the product with the loudest ads, they pay full price at the first store they open, and a lot of it ends up returned or forgotten in a drawer.

At the same time, the way people actually ask for shopping advice has moved into their messages: you text a friend a photo and ask "is this good for me?". AI shopping assistants that live in iMessage (you text them a product, they compare it and find a better price) showed us the right surface. We asked a simple question: what if that assistant could actually **see you**? With YouCam's Skin AI and virtual try-on APIs it can, so we built Mira.

## What it does

Mira is a free AI beauty and style assistant that lives in an iMessage thread. You text it like a friend.

1. **Skin read from one selfie.** Send a selfie and Mira calls **YouCam AI Skin Analysis**, which scores eight concerns (breakouts, redness, oiliness, pores, texture, fine lines, hydration, dark circles), estimates skin age and returns heat map masks. Mira shows a skin score ring, the eight concern bars sorted weakest first, and the heat maps for your three weakest areas right inside the chat.
2. **Picks matched to the measurement, not to ads.** Mira takes your three lowest scores and recommends one product per concern, each on a card with review pills (green, orange, red), the number of sources, the hero ingredient and one line on why it fits your skin. Your profile filters out what you avoid, such as fragrance.
3. **Best price, automatically.** Every pick is checked across three stores; Mira shows the cheapest verified seller and how much you saved.
4. **Tried on before you ask.** This is the agentic moment. Without being prompted, Mira picks a lip shade from your measured redness score and skin age and renders it on your own face with **YouCam Makeup VTO**. The result arrives as a draggable before and after slider.
5. **Just text it.** "Can you show me a bolder lip?" brings up a shade carousel; tap any shade and it is on your face a few seconds later with the best price attached.
6. **The full look.** Ask for an outfit, send a full body photo, and **YouCam AI Clothes** dresses you in the garment. Mira then pairs it with the lip shade you just chose.
7. **It learns how you shop.** Skin type, focus concerns, your shade, money saved and score history are remembered on your phone, so the next chat starts from what Mira already knows instead of from zero.

Everything happens in a pixel faithful iMessage thread that runs in iPhone Safari (add it to the home screen for a full screen app) and on desktop inside a phone frame, with a marketing landing page in front of it.

**Try it live:** https://mira-production-110e.up.railway.app (open it on your iPhone, tap "Text Mira"). A note on the video: our free trial units ran out while we were filming, so the walkthrough was recorded in the app's clearly labelled demo mode (the header says "demo mode"). Every feature in it was verified against the live YouCam API beforehand, with the latencies listed below, and the deployed app runs live.

## How we built it

1. **Frontend:** React 19, TypeScript and Vite. The chat is a hand built iMessage replica: bubbles with tails, typing indicator, a photo sheet (camera, library, demo photos), rich cards for skin reports, product carousels, try-on sliders and the memory card. The landing page uses sticker style product art and mascots drawn in SVG, so the project ships no third party product photos or trademarks.
2. **Agent:** a client side planner (`useMira`) turns every message or photo into a chain of tool calls: read and resize the photo, YouCam Skin Analysis, product matching, price check, YouCam Makeup VTO. Each step streams into the thread as a live trace (spinner, done, failed, with details such as "8 concerns scored" or "saves you $16"), so the user watches the agent work instead of staring at a spinner. A Stop button aborts an in flight scan.
3. **Backend:** a dependency free Node server keeps the YouCam API key off the device and implements the YouCam v2 flow for all three features: register the file (`POST /s2s/v2.0/file`), PUT the bytes to the presigned URL, create the task, and poll until success. It normalises the different result shapes (`results.url`, `results[].download_url`, region split skin scores, the `skin_age` row) and maps YouCam error codes to friendly replies.
4. **YouCam APIs used:**

| API | Endpoint | How Mira uses it |
| :--- | :--- | :--- |
| AI Skin Analysis | `/s2s/v2.0/task/skin-analysis` | 8 SD concerns, JSON output with mask overlays, skin age |
| Makeup VTO | `/s2s/v2.0/task/makeup-vto` | `lip_color` effects (matte, satin, gloss) picked by the agent |
| AI Clothes | `/s2s/v2.0/task/cloth-v4` (falls back to `cloth`) | full look try-on on a full body photo |

5. **Result cache:** identical requests (same photo, same effect) reuse the stored YouCam result and its downloaded images, so retries and replays never spend units twice.
6. **Deploy:** Railway, one service serving both the built web app and the API.

## Challenges we ran into

1. **Every feature has its own input window.** Skin Analysis needs a short side of at least 480 px and a face that covers over 60% of the image width; Makeup VTO wants the long side under 1920 px; AI Clothes needs a full body pose. The client re-encodes every photo for the feature it is about to call.
2. **Real selfies get rejected.** The most common failure is a selfie taken at arm's length (`error_src_face_too_small`). Instead of bouncing the user, the agent heals itself: it zooms toward the face, says so in the trace, and retries once before asking for a closer photo.
3. **The docs describe several result shapes.** The makeup result appears as `results.url` in one place and `results[].download_url` in another, skin concerns can be split by region, and the response includes helper rows such as `resize_image` that are not concerns. We wrote a parser that handles all of them.
4. **Result URLs expire after two hours,** so cached results download the images instead of storing links.
5. **Unit budget.** Skin Analysis costs 9 to 16 units per call, so we built a clearly labelled demo mode (mock scores, local tint preview) for UI work and only spent units on real runs.

## Accomplishments that we're proud of

1. All three YouCam APIs, Skin Analysis, Makeup VTO and AI Clothes, working together as **one conversation** rather than three separate demos: measure, recommend, try on, dress, remember.
2. The unprompted try-on. The agent uses what it just measured (redness, skin age) to decide what to show you, which turns a feature into a conversation.
3. An iMessage experience that a first time user understands in seconds, with no account, no app install and no onboarding.
4. Graceful failure everywhere: friendly errors for face too small, too dark, not front facing, pose, timeout, offline and out of credits, plus the self healing retry.
5. Real latency measured on our demo photos: Skin Analysis about 6 to 9 seconds, Makeup VTO about 8 seconds, AI Clothes about 14 seconds, end to end including upload and polling.

## What we learned

The best moment to use Skin AI is the moment right before a purchase, and the best way to sell a try-on is not to ask for permission: when the agent already has your face and your scores, showing the result unprompted feels like a friend saying "trust me, try this". We also learned that agent UX is mostly about showing the work. A visible step trace made a 15 second multi API chain feel fast and trustworthy.

## What's next for Mira

1. A real product catalog and live price feeds in place of our fictional brands and stores.
2. YouCam Skin Tone analysis to choose foundation and undertone aware shades.
3. Weekly check in scans that chart whether a product is actually working, using the stored score history.
4. A native iMessage relay so the same agent answers texts sent to a real phone number.
5. Shared looks: send your try-on to a friend in the thread and let them vote.
