const fs = require("fs");
const { expect } = require("expect");
const mock = require("jest-mock");
const { join, dirname, basename } = require("path");
const { describe, it, run, resetState } = require("jest-circus");
const vm = require("vm");
// Node.jsのランタイムではないがエミュレートしてくれる
// globalやsetInterval、setTimeoutなどがcontext上で使える
// テスト用のVM環境の中で実際にNode.js環境が実行できるように
const { TestEnvironment } = require("jest-environment-node");

exports.runTest = async (testFile) => {
  const testResult = {
    success: false,
    errorMessage: null,
  };

  try {
    // expectを実装するとしたらこんな感じ
    // const expect = (received) => ({
    //   toBe: (expected) => {
    //     if (received !== expected) {
    //       throw new Error(`Expected '${expected}'but received '${received}'`);
    //     }
    //   },
    // });

    // jest-mockを実装するとしたこんな感じ
    // const mock = {
    //   fn: (implementation) => {
    //     const mockFn = () => {
    //       mockFn.mock.calls.push([]);
    //       implementation?.();
    //     };

    //     mockFn._isMockFunction = true;
    //     mockFn.getMockName = () => "mockFn";
    //     mockFn.mock = {};
    //     mockFn.mock.calls = [];
    //     mockFn.mock.calls.count = () => mockFn.mock.calls.length;
    //     return mockFn;
    //   },
    // };

    // describeとit(jest-circus)を実装するとしたらこんな感じ
    // const describeFns = [];
    // let currentDescribeFn;
    // const describe = (name, fn) => describeFns.push([name, fn]);
    // const it = (name, fn) => currentDescribeFn.push([name, fn]);
    // eval(code);

    // for (const [name, fn] of describeFns) {
    //   currentDescribeFn = [];
    //   testName = name;
    //   // ここでfnを実行しない限り、describeの中で定義されているitの中身は実行されない
    //   // describeの中でitが実行されることでcurrentDescribeFnのなかにitの内容が入る
    //   fn();

    //   for (const [itName, itFn] of currentDescribeFn) {
    //     testName += " " + itName;
    //     itFn();
    //   }
    // }

    // jest-environment-nodeを使わない場合
    // const context = { describe, it, expect, mock };
    // vm.createContext(context);
    // vm.runInContext(code, context);

    resetState();

    let environment;

    const customRequire = (filename) => {
      const code = fs.readFileSync(join(dirname(testFile), filename), "utf8");
      // vm.runInContextの返り値は第一引数のcodeの評価結果
      const moduleFactory = vm.runInContext(
        `(function(module, require) {${code}})`,
        environment.getVmContext()
      );
      const module = { exports: {} };
      moduleFactory(module, customRequire);

      return module.exports;
    };

    environment = new TestEnvironment({
      projectConfig: {
        testEnvironmentOptions: {
          describe,
          it,
          expect,
          mock,
        },
      },
    });

    // このままeval使うとテスト同士が干渉してしまう
    // eval(code);
    // vmを使い、contextを指定することで、テスト同士が干渉しない
    // vm.runInContext(code, environment.getVmContext());

    // customRequireを定義し、従来のrequireを上書きすることで、テストが依存しているモジュールをテストファイル上で実行できるようになる
    customRequire(basename(testFile));
    // customRequire('tests/describe.test.js')の場合
    // この第二引数のrequireはcustomRequire
    // (function (module, require) {
    //   const banana = require("./banana.js");
    //
    //   it("tastes good", () => {
    //     expect(banana).toBe("good");
    //   });
    // });

    // const banana = customRequire("./banana.js");
    // const banana = function (module, require) {
    //   // module.exportsしてる場合はcustomRequireの返り値が空オブジェクトから上書きされる
    //   module.exports = "good";
    // };
    // // 最終的にcustomRequireの返り値はmodule.exportsになるのでテストファイル上では以下になる
    // const banana = "good";

    const { testResults } = await run();
    testResult.testResults = testResults;
    testResult.success = testResults.every((result) => !result.errors.length);
  } catch (error) {
    testResult.errorMessage = error.message;
  }

  return testResult;
};
