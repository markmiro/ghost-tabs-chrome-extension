function closestValue(steps, key, value) {
  for (let i = 0; i < steps.length; i++) {
    if (steps[i][key] === value) {
      return i;
    }
  }
  throw new Error("Unsupported value: " + value);
}

export const fadeHalfLife = {
  steps: [
    { title: "3 seconds", ms: 1000 * 3 },
    { title: "1 minute", ms: 1000 * 60 * 1 },
    { title: "15 minutes", ms: 1000 * 60 * 15 },
    { title: "30 minutes", ms: 1000 * 60 * 30 },
    { title: "1 hour", ms: 1000 * 60 * 60 },
    { title: "2 hours", ms: 1000 * 60 * 60 * 2 },
    { title: "4 hours", ms: 1000 * 60 * 60 * 4 },
    { title: "8 hours", ms: 1000 * 60 * 60 * 8 },
    { title: "16 hours", ms: 1000 * 60 * 60 * 16 },
  ],
  stepValue: (s) => fadeHalfLife.steps[s].ms,
  valueToStep: (v) => closestValue(fadeHalfLife.steps, "ms", v),
  updateValueTitle: (v) => {
    const step = fadeHalfLife.valueToStep(v);
    document.getElementById("fadeHalfLifeTitle").innerText =
      fadeHalfLife.steps[step].title;
  },
};

export const minFavIconOpacity = {
  steps: [
    { title: "0%", opacity: 0 },
    { title: "5%", opacity: 0.05 },
    { title: "10%", opacity: 0.1 },
    { title: "25%", opacity: 0.25 },
    { title: "50%", opacity: 0.5 },
  ],
  stepValue: (s) => minFavIconOpacity.steps[s].opacity,
  valueToStep: (v) => closestValue(minFavIconOpacity.steps, "opacity", v),
  updateValueTitle: (v) => {
    const step = minFavIconOpacity.valueToStep(v);
    document.getElementById("minFavIconOpacityTitle").innerText =
      minFavIconOpacity.steps[step].title;
  },
};

export const fadeTimeToReset = {
  steps: [
    { title: "instant", ms: 0 },
    { title: "½ second", ms: 1000 * 0.5 },
    { title: "1 second", ms: 1000 * 1 },
    { title: "2 seconds", ms: 1000 * 2 },
    { title: "5 seconds", ms: 1000 * 5 },
  ],
  stepValue: (s) => fadeTimeToReset.steps[s].ms,
  valueToStep: (v) => closestValue(fadeTimeToReset.steps, "ms", v),
  updateValueTitle: (v) => {
    const step = fadeTimeToReset.valueToStep(v);
    document.getElementById("fadeTimeToResetTitle").innerText =
      fadeTimeToReset.steps[step].title;
  },
};
