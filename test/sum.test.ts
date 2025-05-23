import { describe, expect, it } from 'vitest';
import { handleArgs } from '../src/index';
import pkg from '../package.json';
import { helpContent } from '../src/util';

describe('show version', () => {
  it('显示版本号', () => {
    expect(
      handleArgs({
        _: [],
        '--version': true,
        tgzFolder: '_test_',
        cwd: '_virtual_',
      }),
    ).toEqual(pkg.version);
  });
});

describe('show help', () => {
  it('显示帮助信息', () => {
    expect(
      handleArgs({
        _: [],
        '--help': true,
        tgzFolder: '_test_',
        cwd: '_virtual_',
      }),
    ).toEqual(helpContent);
  });
});

// describe("download tgz", () => {
//   it("download lodash", () => {
//     (handleArgs({
//       '_': ['lodash'],
//     }));
//   });
// });
