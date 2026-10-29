import { readdirSync } from 'node:fs'

import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import storybook from 'eslint-plugin-storybook'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// Imports à sens unique (ADR-002 § 2) : partagé → domaines → routes.
// Un domaine (src/features/<domaine>) n'importe pas un autre domaine.
const domains = readdirSync(new URL('./src/features', import.meta.url))

const domainRules = domains.map((domain) => ({
  files: [`src/features/${domain}/**`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@/features/*', `!@/features/${domain}`, '@/routes/*'],
            message: "Un domaine n'importe ni un autre domaine ni une route : passer par src/components ou src/lib.",
          },
        ],
      },
    ],
  },
}))

export default defineConfig([
  globalIgnores([
    'dist',
    'storybook-static',
    'test-results',
    'playwright-report',
    'src/routeTree.gen.ts',
    'src/api/schema.d.ts',
    'test/public/mockServiceWorker.js',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      reactHooks.configs.flat.recommended,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // Les nombres dans les gabarits de chaînes sont courants et sans risque.
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // Gestionnaires d'événements écrits en flèche courte : onClick={() => mutation.mutate()}.
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
      // Le routeur interrompt une navigation en levant redirect(), qui n'est pas une Error.
      '@typescript-eslint/only-throw-error': [
        'error',
        { allow: [{ from: 'package', package: '@tanstack/router-core', name: 'Redirect' }] },
      ],
    },
  },
  {
    files: ['src/components/**', 'src/lib/**', 'src/api/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*', '@/routes/*', '@/app/*'],
              message: 'Le code partagé ne dépend ni des domaines, ni des routes, ni de l’application.',
            },
          ],
        },
      ],
    },
  },
  ...domainRules,
  {
    // Composants générés par shadcn/ui : gardés tels que l'outil les écrit.
    files: ['src/components/ui/**'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  storybook.configs['flat/recommended'],
  {
    files: ['eslint.config.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
])
