import toolkit_lib_io_internal = require("../../node_modules/@aws-cdk/toolkit-lib/lib/api/io/private/index.js");
import toolkit_lib_log_internal = require("../../node_modules/@aws-cdk/toolkit-lib/lib/api/aws-auth/sdk-logger.js");
import { IIoHost } from "@aws-cdk/toolkit-lib";

class IoHostSdkLogger extends toolkit_lib_log_internal.IoHostSdkLogger {
  constructor(iohelper: toolkit_lib_io_internal.IoHelper) {
    super(iohelper);
  }

  public override trace(...content: any[]): void {
    (this as any).notify("info", ...content);
  }

  public override debug(...content: any[]): void {
    (this as any).notify("info", ...content);
  }
}

export class NotificationHelper {
  private constructor() { }

  public static getIoHelper(iohost: IIoHost): toolkit_lib_io_internal.IoHelper {
    return toolkit_lib_io_internal.IoHelper.fromIoHost(iohost, "synth");
  }

  public static getSdkLogger(iohelper: toolkit_lib_io_internal.IoHelper): toolkit_lib_log_internal.ISdkLogger {
    return new IoHostSdkLogger(iohelper);
  }
}
