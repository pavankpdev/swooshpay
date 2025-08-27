/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // examples you can tighten later
    'scope-case': [2, 'always', 'kebab-case'],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
     // allow descriptions (body) freely
    // disable the "blank line before body" enforcement if it gets in your way
    'body-leading-blank': [0],
    // disable line length limits for body/footer so long descriptions pass
    'body-max-line-length': [0],
    'footer-max-line-length': [0]
  }
};
