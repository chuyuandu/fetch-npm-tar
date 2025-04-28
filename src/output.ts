import chalk from "chalk";
import ora from "ora";

export class Output {
  public spinner = ora();
  public total: number = 0;
  public succeedNum = 0;
  public failedNum = 0;
  // private failedMsg: string[] = [];

  constructor(private root: string) {
    this.root = root;
  }

  start(total: number) {
    this.total = total;
    this.spinner.start();
    this.reRender();
  }

  succeedItem() {
    this.succeedNum++;
    this.reRender();
  }

  failedItem(msg: string, doFailed = true) {
    if (doFailed) {
      this.failedNum++;
    }
    // this.failedMsg.push(msg);
    this.spinner.clear();
    console.log(msg);
    this.reRender();
  }

  reRender() {
    this.spinner.text = ` 共: ${chalk.blue(this.total)}, 成功：${
      this.succeedNum > 0 ? chalk.green(this.succeedNum) : this.succeedNum
    }, 失败：${
      this.failedNum > 0 ? chalk.red(this.failedNum) : this.failedNum
    }, 剩余: ${this.total - this.succeedNum - this.failedNum}`;
    //     this.spinner.text = ` 共: ${this.total}, 成功：${this.succeedNum}, 失败：${this.failedNum}, 剩余: ${this.total - this.succeedNum - this.failedNum}
    // ${this.failedMsg.join('\n')}`
  }

  finish() {
    if (this.total === this.succeedNum) {
      this.spinner.succeed();
    } else if (this.failedNum === this.total) {
      this.spinner.fail();
    } else {
      this.spinner.warn();
    }
    console.log(`文件保存至: ${chalk.underline(this.root)}`);
  }
}
