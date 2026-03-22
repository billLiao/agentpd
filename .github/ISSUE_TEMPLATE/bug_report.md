name: Bug Report
description: 报告 AgentPD 中的 Bug
title: "[Bug] "
labels: ["bug", "needs-triage"]
assignees: []
body:
  - type: markdown
    attributes:
      value: |
        感谢您报告 Bug！请尽可能详细地描述问题。

  - type: input
    id: version
    attributes:
      label: AgentPD 版本
      description: 请提供您使用的 AgentPD 版本号
      placeholder: "例如: 1.0.0"
    validations:
      required: true

  - type: dropdown
    id: environment
    attributes:
      label: 运行环境
      options:
        - Windows
        - macOS
        - Linux
        - Docker
        - 其他
    validations:
      required: true

  - type: textarea
    id: description
    attributes:
      label: Bug 描述
      description: 请详细描述您遇到的问题
      placeholder: |
        1. 您想要做什么？
        2. 实际发生了什么？
        3. 预期应该发生什么？
    validations:
      required: true

  - type: textarea
    id: steps
    attributes:
      label: 重现步骤
      description: 请提供详细的步骤来重现此问题
      placeholder: |
        1. 进入 "..."
        2. 点击 "..."
        3. ...
    validations:
      required: true

  - type: textarea
    id: expected
    attributes:
      label: 预期行为
      description: 描述您期望的行为
    validations:
      required: true

  - type: textarea
    id: actual
    attributes:
      label: 实际行为
      description: 描述实际发生的行为
    validations:
      required: true

  - type: textarea
    id: logs
    attributes:
      label: 相关日志/截图
      description: 如果有错误日志或截图，请提供
      placeholder: |
        ```
        错误日志或截图粘贴于此
        ```
