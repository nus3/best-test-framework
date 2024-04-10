const banana = require("./banana.js");
const apple = require("./apple.js");

it("tastes good", () => {
  expect(banana).toBe("good");
});

it("tastes delicious", () => {
  expect(apple).toBe("good");
});

describe("describe test", () => {
  it("works", () => {
    expect(1).toBe(1);
  });
});

describe("second describe test", () => {
  it("doesn't work", () => {
    expect(1).toBe(2);
  });
});
