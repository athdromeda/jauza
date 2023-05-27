const { JD } = require('../../packages/core/src/time');

describe('Julian Date', () => {
  test('should return 2431684.5 for JD of Aug 17, 1945', () => {
    expect(JD(1945, 8, 17)).toBe(2431684.5);
  });
});
