function randomPlant(type = Math.random() < 0.5 ? 'first' : 'second') {
  return {
    type,
    K: 0.5 + Math.random() * 2,
    tau: 0.5 + Math.random() * 3,
    zeta: 0.2 + Math.random() * 0.65,
    omega: 1 + Math.random() * 3
  };
}
