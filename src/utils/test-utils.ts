function evaluateCondition(condition) {
  return typeof condition === 'function' ? condition() : !!condition;
}

export function describeIf(name: string, condition: any, tests: any) {
  if (evaluateCondition(condition)) {
    describe(name, tests);
  } else {
    describe(name, () => {
      it(`skipped '${name}' because condition doesn't apply`, () => { /* empty */ });
    });
    describe.skip('', tests);
  }
}

export function itIf(name: string, condition: any, test: any) {
  if (evaluateCondition(condition)) {
    return it(name, test);
  } else {
    return it.skip(name, test);
  }
}
