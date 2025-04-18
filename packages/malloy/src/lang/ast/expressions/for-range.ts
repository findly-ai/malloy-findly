/*
 * Copyright 2023 Google LLC
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files
 * (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import {errorFor} from '../ast-utils';
import * as TDU from '../typedesc-utils';
import {castTo, resolution, timeOffset} from '../time-utils';
import type {BinaryMalloyOperator} from '../types/binary_operators';
import type {ExprValue} from '../types/expr-value';
import {computedErrorExprValue} from '../types/expr-value';
import {ExpressionDef} from '../types/expression-def';
import type {FieldSpace} from '../types/field-space';
import {ExprTime} from './expr-time';
import {Range} from './range';
import type {Timeframe} from './time-frame';

export class ForRange extends ExpressionDef {
  elementType = 'forRange';
  legalChildTypes = [TDU.timestampT, TDU.dateT];
  constructor(
    readonly from: ExpressionDef,
    readonly duration: ExpressionDef,
    readonly timeframe: Timeframe
  ) {
    super({from: from, duration: duration, timeframe: timeframe});
  }

  apply(
    fs: FieldSpace,
    op: BinaryMalloyOperator,
    expr: ExpressionDef
  ): ExprValue {
    const startV = this.from.getExpression(fs);
    const checkV = expr.getExpression(fs);
    if (!this.typeCheck(expr, checkV)) {
      return errorFor('no time for range');
    }
    const nV = this.duration.getExpression(fs);
    if (nV.type !== 'number') {
      if (nV.type !== 'error') {
        this.logError(
          'invalid-duration-quantity',
          `FOR duration count must be a number, not '${nV.type}'`
        );
      }
      return computedErrorExprValue({
        dataType: {type: 'boolean'},
        error: 'for not number',
        from: [startV, checkV],
      });
    }
    const units = this.timeframe.text;

    // If the duration resolution is smaller than date, we have
    // to do the computaion with timestamps.
    let rangeType = resolution(units);

    // Next, if the beginning of the range is a timestamp, then we
    // also have to do the computation as a timestamp
    if (startV.type === 'timestamp') {
      rangeType = 'timestamp';
    }

    // everything is dates, do date math
    if (checkV.type === 'date' && rangeType === 'date') {
      const rangeStart = this.from;
      const rangeEndV = timeOffset('date', startV.value, '+', nV.value, units);
      const rangeEnd = new ExprTime('date', rangeEndV);
      return new Range(rangeStart, rangeEnd).apply(fs, op, expr);
    }

    // Now it doesn't matter if the range is a date or a timestamp,
    // the comparison will be in timestamp space,
    const applyTo = ExprTime.fromValue('timestamp', checkV);

    let rangeStart = this.from;
    let from = startV.value;
    if (startV.type === 'date') {
      const tsVersion = startV.morphic && startV.morphic['timestamp'];
      if (tsVersion) {
        from = tsVersion;
      } else {
        from = castTo('timestamp', from, 'date');
      }
      rangeStart = new ExprTime('timestamp', from, [startV]);
    }
    const to = timeOffset('timestamp', from, '+', nV.value, units);
    const rangeEnd = new ExprTime('timestamp', to, [startV, nV]);

    return new Range(rangeStart, rangeEnd).apply(fs, op, applyTo);
  }

  requestExpression(_fs: FieldSpace): undefined {
    return undefined;
  }

  getExpression(_fs: FieldSpace): ExprValue {
    return this.loggedErrorExpr('range-as-value', 'A Range is not a value');
  }
}
