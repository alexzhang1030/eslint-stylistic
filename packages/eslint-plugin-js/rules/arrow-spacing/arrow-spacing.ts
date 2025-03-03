/**
 * @fileoverview Rule to define spacing before/after arrow function's arrow.
 * @author Jxck
 */

import { isArrowToken } from '../../utils/ast-utils'
import { createRule } from '../../utils/createRule'
import type { Token, Tree } from '../../utils/types'
import type { MessageIds, RuleOptions } from './types'

export default createRule<MessageIds, RuleOptions>({
  meta: {
    type: 'layout',

    docs: {
      description: 'Enforce consistent spacing before and after the arrow in arrow functions',
      url: 'https://eslint.style/rules/js/arrow-spacing',
    },

    fixable: 'whitespace',

    schema: [
      {
        type: 'object',
        properties: {
          before: {
            type: 'boolean',
            default: true,
          },
          after: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],

    messages: {
      expectedBefore: 'Missing space before =>.',
      unexpectedBefore: 'Unexpected space before =>.',

      expectedAfter: 'Missing space after =>.',
      unexpectedAfter: 'Unexpected space after =>.',
    },
  },

  create(context) {
    // merge rules with default
    const rule = Object.assign({}, context.options[0])

    rule.before = rule.before !== false
    rule.after = rule.after !== false

    const sourceCode = context.sourceCode

    /**
     * Get tokens of arrow(`=>`) and before/after arrow.
     * @param {ASTNode} node The arrow function node.
     * @returns {object} Tokens of arrow and before/after arrow.
     */
    function getTokens(node: Tree.ArrowFunctionExpression) {
      const arrow = sourceCode.getTokenBefore(node.body, isArrowToken)!

      return {
        before: sourceCode.getTokenBefore(arrow)!,
        arrow,
        after: sourceCode.getTokenAfter(arrow)!,
      }
    }

    /**
     * Count spaces before/after arrow(`=>`) token.
     * @param {object} tokens Tokens before/after arrow.
     * @returns {object} count of space before/after arrow.
     */
    function countSpaces(tokens: { before: Token, arrow: Token, after: Token }) {
      const before = tokens.arrow.range[0] - tokens.before.range[1]
      const after = tokens.after.range[0] - tokens.arrow.range[1]

      return { before, after }
    }

    /**
     * Determines whether space(s) before after arrow(`=>`) is satisfy rule.
     * if before/after value is `true`, there should be space(s).
     * if before/after value is `false`, there should be no space.
     * @param {ASTNode} node The arrow function node.
     * @returns {void}
     */
    function spaces(node: Tree.ArrowFunctionExpression) {
      const tokens = getTokens(node)
      const countSpace = countSpaces(tokens)

      if (rule.before) {
        // should be space(s) before arrow
        if (countSpace.before === 0) {
          context.report({
            node: tokens.before,
            messageId: 'expectedBefore',
            fix(fixer) {
              return fixer.insertTextBefore(tokens.arrow, ' ')
            },
          })
        }
      }
      else {
        // should be no space before arrow
        if (countSpace.before > 0) {
          context.report({
            node: tokens.before,
            messageId: 'unexpectedBefore',
            fix(fixer) {
              return fixer.removeRange([tokens.before.range[1], tokens.arrow.range[0]])
            },
          })
        }
      }

      if (rule.after) {
        // should be space(s) after arrow
        if (countSpace.after === 0) {
          context.report({
            node: tokens.after,
            messageId: 'expectedAfter',
            fix(fixer) {
              return fixer.insertTextAfter(tokens.arrow, ' ')
            },
          })
        }
      }
      else {
        // should be no space after arrow
        if (countSpace.after > 0) {
          context.report({
            node: tokens.after,
            messageId: 'unexpectedAfter',
            fix(fixer) {
              return fixer.removeRange([tokens.arrow.range[1], tokens.after.range[0]])
            },
          })
        }
      }
    }

    return {
      ArrowFunctionExpression: spaces,
    }
  },
})
