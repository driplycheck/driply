// Агенты Driply: у каждого своя тема в группе. Сообщение в теме запускает его
// в GitHub Actions, где работает Claude Code с доступом к репозиторию.
// Роль и инструменты каждого описаны в .github/agents/<kind>.md.
export const AGENTS: Record<string, { name: string; topic: string }> = {
  tester: { name: 'Тестировщик', topic: '🧪 Тестировщик' },
  analyst: { name: 'Аналитик', topic: '📊 Аналитик' },
  dev: { name: 'Разработчик', topic: '🔧 Разработчик' },
}
