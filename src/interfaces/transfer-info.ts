export class TransferInfo {

  public constructor(
    msg: string,
    prefix: string,
    keyboardName: string,
  ) {
    this.msg = msg;
    this.prefix = prefix;
    this.keyboardName = keyboardName;
  }

  public msg: string;
  public prefix: string;
  public keyboardName: string;
}
