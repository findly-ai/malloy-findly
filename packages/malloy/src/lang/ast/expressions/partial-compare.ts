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

import type {CompareMalloyOperator} from '../types/binary_operators';
import type {ExprValue} from '../types/expr-value';
import {ATNodeType, ExpressionDef} from '../types/expression-def';
import type {FieldSpace} from '../types/field-space';

export class PartialCompare extends ExpressionDef {
  elementType = '<=> a';
  constructor(
    readonly op: CompareMalloyOperator,
    readonly right: ExpressionDef
  ) {
    super({right: right});
  }

  granular(): boolean {
    return this.right.granular();
  }

  apply(fs: FieldSpace, op: string, expr: ExpressionDef): ExprValue {
    return this.right.apply(fs, this.op, expr);
  }

  requestExpression(_fs: FieldSpace): ExprValue | undefined {
    return undefined;
  }

  getExpression(_fs: FieldSpace): ExprValue {
    return this.loggedErrorExpr(
      'partial-as-value',
      'Partial comparison does not have a value'
    );
  }

  atNodeType(): ATNodeType {
    return ATNodeType.Partial;
  }
}
