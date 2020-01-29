import { bindNodeCallback, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import * as child from 'child_process';

export function exec(command: string, options: child.ExecOptions): Observable<number> {
  const execAsObservable = bindNodeCallback(
    (
      cmd: string,
      opts: child.ExecOptions,
      callback: (error: Error) => void,
    ) => child.exec(cmd, opts, callback),
  );

  return execAsObservable(command, options).pipe(
    map(() => 0),
  );
}
