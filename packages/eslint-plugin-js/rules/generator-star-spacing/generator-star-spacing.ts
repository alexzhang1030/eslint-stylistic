/**
 * @fileoverview Rule to check the spacing around the * in generator functions.
 * @author Jamund Ferguson
 */

import { createRule } from '../../utils/createRule'
import type { JSONSchema, Token, Tree } from '../../utils/types'

const OVERRIDE_SCHEMA: JSONSchema.JSONSchema4 = {
  oneOf: [
    {
      type: 'string',
      enum: ['before', 'after', 'both', 'neither'],
    },
    {
      type: 'object',
      properties: {
        before: { type: 'boolean' },
        after: { type: 'boolean' },
      },
      additionalProperties: false,
    },
  ],
}

export default createRule({
  meta: {
    type: 'layout',

    docs: {
      description: 'Enforce consistent spacing around `*` operators in generator functions',
      url: 'https://eslint.style/rules/js/generator-star-spacing',
    },

    fixable: 'whitespace',

    schema: [
      {
        oneOf: [
          {
            type: 'string',
            enum: ['before', 'after', 'both', 'neither'],
          },
          {
            type: 'object',
            properties: {
              before: { type: 'boolean' },
              after: { type: 'boolean' },
              named: OVERRIDE_SCHEMA,
              anonymous: OVERRIDE_SCHEMA,
              method: OVERRIDE_SCHEMA,
            },
            additionalProperties: false,
          },
        ],
      },
    ],

    messages: {
      missingBefore: 'Missing space before *.',
      missingAfter: 'Missing space after *.',
      unexpectedBefore: 'Unexpected space before *.',
      unexpectedAfter: 'Unexpected space after *.',
    },
  },

  create(context) {
    const optionDefinitions = {
      before: { before: true, after: false },
      after: { before: false, after: true },
      both: { before: true, after: true },
      neither: { before: false, after: false },
    }

    /**
     * Returns resolved option definitions based on an option and defaults
     * @param {any} option The option object or string value
     * @param {object} defaults The defaults to use if options are not present
     * @returns {object} the resolved object definition
     */
    function optionToDefinition(option: keyof typeof optionDefinitions | unknown, defaults: { before: boolean, after: boolean }) {
      if (!option)
        return defaults

      return typeof option === 'string'
        ? optionDefinitions[option as keyof typeof optionDefinitions]
        : Object.assign({}, defaults, option)
    }

    const modes = (function (option) {
      const defaults = optionToDefinition(option, optionDefinitions.before)

      return {
        named: optionToDefinition(option.named, defaults),
        anonymous: optionToDefinition(option.anonymous, defaults),
        method: optionToDefinition(option.method, defaults),
      }
    }(context.options[0] || {}))

    const sourceCode = context.sourceCode

    /**
     * Checks if the given token is a star token or not.
     * @param {Token} token The token to check.
     * @returns {boolean} `true` if the token is a star token.
     */
    function isStarToken(token: Token) {
      return token.value === '*' && token.type === 'Punctuator'
    }

    /**
     * Gets the generator star token of the given function node.
     * @param {ASTNode} node The function node to get.
     * @returns {Token} Found star token.
     */
    function getStarToken(node: Tree.FunctionDeclaration | Tree.FunctionExpression) {
      return sourceCode.getFirstToken(
        (('method' in node.parent && node.parent.method) || node.parent.type === 'MethodDefinition') ? node.parent : node,
        isStarToken,
      )
    }

    /**
     * capitalize a given string.
     * @param {string} str the given string.
     * @returns {string} the capitalized string.
     */
    function capitalize(str: string) {
      return str[0].toUpperCase() + str.slice(1)
    }

    /**
     * Checks the spacing between two tokens before or after the star token.
     * @param {string} kind Either "named", "anonymous", or "method"
     * @param {string} side Either "before" or "after".
     * @param {Token} leftToken `function` keyword token if side is "before", or
     *     star token if side is "after".
     * @param {Token} rightToken Star token if side is "before", or identifier
     *     token if side is "after".
     * @returns {void}
     */
    function checkSpacing(kind: keyof typeof modes, side: 'before' | 'after', leftToken: Token, rightToken: Token) {
      if (!!(rightToken.range[0] - leftToken.range[1]) !== modes[kind][side]) {
        const after = leftToken.value === '*'
        const spaceRequired = modes[kind][side]
        const node = after ? leftToken : rightToken
        const messageId = `${spaceRequired ? 'missing' : 'unexpected'}${capitalize(side)}` as `${'missing' | 'unexpected'}${'After' | 'Before'}`

        context.report({
          node,
          messageId,
          fix(fixer) {
            if (spaceRequired) {
              if (after)
                return fixer.insertTextAfter(node, ' ')

              return fixer.insertTextBefore(node, ' ')
            }
            return fixer.removeRange([leftToken.range[1], rightToken.range[0]])
          },
        })
      }
    }

    /**
     * Enforces the spacing around the star if node is a generator function.
     * @param {ASTNode} node A function expression or declaration node.
     * @returns {void}
     */
    function checkFunction(node: Tree.FunctionDeclaration | Tree.FunctionExpression) {
      if (!node.generator)
        return

      const starToken = getStarToken(node)!
      const prevToken = sourceCode.getTokenBefore(starToken)!
      const nextToken = sourceCode.getTokenAfter(starToken)!

      let kind: keyof typeof modes = 'named'

      if (node.parent.type === 'MethodDefinition' || (node.parent.type === 'Property' && node.parent.method))
        kind = 'method'
      else if (!node.id)
        kind = 'anonymous'

      // Only check before when preceded by `function`|`static` keyword
      if (!(kind === 'method' && starToken === sourceCode.getFirstToken(node.parent)))
        checkSpacing(kind, 'before', prevToken, starToken)

      checkSpacing(kind, 'after', starToken, nextToken)
    }

    return {
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
    }
  },
})
