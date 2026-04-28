## Important: what's actually possible here

You asked to "train the model" to recognize 21 full sentence gestures in real time. I want to be upfront before we spend effort:

**Real sentence-level sign recognition is not something I can deliver inside this Lovable project.** Here's why:

1. **Real sentence signs are dynamic, two-handed, and use facial cues.** Phrases like "How are you?", "Good Morning", "Thank You", "I Am Hungry" are *motion sequences* over 1–3 seconds, often with both hands and mouth movement. A static-frame classifier cannot represent them.
2. **Training a real model requires a labeled video dataset** (hundreds of clips per phrase from multiple signers), a temporal model (LSTM / Transformer / 3D-CNN over MediaPipe landmark sequences), a GPU training pipeline, evaluation, and conversion to TF.js. That's a multi-week ML project, not an in-app code change. Lovable's sandbox cannot collect a dataset, train a temporal model, or ship calibrated confidence scores for it.
3. **The current detector is a hand-shape rule engine** (`src/lib/signClassifier.ts`) running on single-frame MediaPipe landmarks. It only knows static poses (A–Z, 0–9, a few emoji gestures). The bundled `public/model/model.json` CNN is unused by the live pipeline.
4. **"No change in confidence" is not achievable for genuinely new classes.** Any honest classifier reports lower confidence on signs it was never trained on. The previous step (mapping one gesture to one sentence label) preserved confidence only because nothing actually changed under the hood — it was a rename.

If I claimed otherwise and shipped a "trained sentence model," it would be fake — either a lookup table dressed up as ML, or a model that misfires constantly. I won't do that.

## What I can realistically build (pick one)

### Option A — Honest 1-gesture-per-sentence mapping (recommended, what's already partly in place)
Extend the existing gesture→sentence map to cover all 21 phrases by binding each to a unique static hand pose the rule engine already detects (letters + emoji-gestures). Confidence stays exactly as the underlying gesture's confidence. Already wired for ~18 of these; I'll fill the gaps (Good Morning, Good Evening, I Understand, I Am Sad, etc.) and update the on-screen reference guide. **Real, accurate, no fake ML.**

### Option B — Two-step "phrase composer"
Detect a short prefix sign (e.g. ✋ Open Palm) to enter "phrase mode," then a second sign picks the phrase from a small menu shown on screen. More phrases, still honest.

### Option C — Voice-input phrasebook
Add a phrasebook UI: a grid of the 21 sentences the user can tap or trigger by voice. Speaks them aloud through the same TTS. Useful as an accessibility tool, but not sign-driven.

### Option D — Plan a real ML pipeline (out of scope for Lovable)
I write the training pipeline (Python + MediaPipe + Keras LSTM) as a separate repo for you to run on Colab/your machine, collect ~50 clips/phrase yourself, train, export to TF.js, then drop the model into this app. I can scaffold the trainer code, but **you** must record the dataset and run training. Several days of your time minimum.

## My recommendation

Go with **Option A** now (immediate, accurate, side-by-side layout already done), and if you want true sentence detection later, do **Option D** as a separate effort.

Tell me which option to proceed with, or push back if you want something different.
