name: Feature Request
description: 为 AgentPD 提出新功能建议
title: "[Feature] "
labels: ["enhancement", "needs-triage"]
assignees: []
body:
  - type: markdown
    attributes:
      value: |
        感谢您提出功能建议！请详细描述您希望添加的功能。

  - type: textarea
    id: summary
    attributes:
      label: 功能摘要
      description: 用一两句话概括您的功能建议
      placeholder: "简要描述您希望添加的功能"
    validations:
      required: true

  - type: textarea
    id: problem
    attributes:
      label: 问题/动机
      description: |
        描述这个功能要解决的具体问题或用例
        - 这个功能解决了什么问题？
        - 为什么需要这个功能？
      placeholder: |
        描述您遇到的具体问题或场景
    validations:
      required: true

  - type: textarea
    id: solution
    attributes:
      label: 解决方案
      description: 描述您理想中的解决方案
      placeholder: |
        描述您希望如何实现这个功能
    validations:
      required: true

  - type: textarea
    id: alternatives
    attributes:
      label: 替代方案
      description: 您考虑过哪些替代方案？
      placeholder: |
        描述您考虑过的其他解决方案
    validations:
      required: false

  - type: textarea
    id: context
    attributes:
      label: 其他上下文
      description: 添加任何其他相关上下文或截图
      placeholder: |
        其他相关信息或截图
