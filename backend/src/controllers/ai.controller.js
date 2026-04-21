const https = require("https");
const { URL } = require("url");
const { asyncHandler } = require("../utils/asyncHandler");
const { createHttpError } = require("../utils/httpError");

const MODE_LABELS = {
  summary: "Tóm tắt bài học",
  questions: "Tạo câu hỏi",
  rubric: "Gợi ý rubric",
  explain: "Giải thích theo mức độ",
};

const levelHints = {
  beginner: "giải thích thật đơn giản, dùng ví dụ gần gũi",
  intermediate: "giải thích vừa đủ chi tiết, có khái niệm chính",
  advanced: "giải thích sâu hơn, thêm liên hệ và lưu ý nâng cao",
};

const stripCodeFences = (text) => {
  if (!text) return "";
  return String(text)
    .replace(/^```[a-z]*\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();
};

const extractJson = (text) => {
  const cleaned = stripCodeFences(text);
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1);
  }
  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    return cleaned.slice(firstBracket, lastBracket + 1);
  }
  return cleaned;
};

const makeSnippet = (content, maxLength = 700) => {
  const text = String(content || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
};

const bulletize = (content, fallbackCount = 4) => {
  const sentences = String(content || "")
    .split(/(?<=[.!?。！？])\s+|\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const selected = sentences.slice(0, Math.max(2, fallbackCount));
  if (selected.length === 0) return ["Chưa có đủ nội dung để tóm tắt tự động."];
  return selected.map((item) => item.replace(/^[-*•]\s*/, ""));
};

const inferKeyTerms = (content, limit = 6) => {
  const words = String(content || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3);
  const stopWords = new Set([
    "và",
    "the",
    "các",
    "cho",
    "trong",
    "của",
    "một",
    "những",
    "khi",
    "với",
    "from",
    "that",
    "this",
    "into",
    "have",
    "what",
    "about",
  ]);
  const counts = new Map();
  words.forEach((word) => {
    if (stopWords.has(word)) return;
    counts.set(word, (counts.get(word) || 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
};

const buildFallback = ({
  mode,
  title,
  content,
  level,
  questionCount,
  subject,
  audience,
  assignmentType,
}) => {
  const snippet = makeSnippet(content);
  const titleText = title || subject || "nội dung học tập";

  if (mode === "summary") {
    return {
      mode,
      title: MODE_LABELS[mode],
      text: [
        `Tóm tắt cho ${audience || "người học"} về ${titleText}:`,
        ...bulletize(content, 4).map((item) => `- ${item}`),
      ].join("\n"),
      suggestions: inferKeyTerms(content).map(
        (term) => `Ôn lại khái niệm: ${term}`,
      ),
    };
  }

  if (mode === "questions") {
    const keyTerms = inferKeyTerms(
      content,
      Math.max(4, Number(questionCount) || 5),
    );
    const count = Math.max(1, Math.min(20, Number(questionCount) || 5));
    const questions = Array.from({ length: count }, (_, index) => {
      const term =
        keyTerms[index % Math.max(1, keyTerms.length)] ||
        `ý chính ${index + 1}`;
      return {
        question: `Câu ${index + 1}: Nội dung nào mô tả đúng nhất về ${term}?`,
        options: [
          `Phương án A liên quan đến ${term}`,
          `Phương án B`,
          `Phương án C`,
          `Phương án D`,
        ],
        answerIndex: 0,
        explanation: `Dựa trên phần nội dung hiện có, ${term} là ý trọng tâm cần nắm.`,
        difficulty:
          index % 3 === 0 ? "Dễ" : index % 3 === 1 ? "Trung bình" : "Khó",
      };
    });

    return {
      mode,
      title: MODE_LABELS[mode],
      text: `Đã tạo ${questions.length} câu hỏi dựa trên ${titleText}.`,
      questions,
      suggestions: [
        `Kiểm tra lại phương án đúng trước khi đưa vào bài kiểm tra chính thức.`,
      ],
    };
  }

  if (mode === "rubric") {
    return {
      mode,
      title: MODE_LABELS[mode],
      text: [
        `Rubric gợi ý cho bài ${assignmentType || "tự luận"} ${titleText}:`,
        `- 30%: Nắm đúng khái niệm và yêu cầu chính`,
        `- 30%: Lập luận rõ ràng, có dẫn chứng từ nội dung bài`,
        `- 20%: Trình bày mạch lạc, đúng cấu trúc`,
        `- 20%: Sáng tạo, mở rộng hoặc liên hệ thực tế`,
      ].join("\n"),
      suggestions: [
        "Chia thang điểm theo từng tiêu chí để chấm nhất quán.",
        "Có thể thêm mức trừ điểm cho lỗi kiến thức trọng yếu.",
      ],
    };
  }

  return {
    mode,
    title: MODE_LABELS[mode],
    text: [
      `Giải thích ở mức ${level || "intermediate"}:`,
      levelHints[level] || levelHints.intermediate,
      snippet ? `\nNội dung gốc: ${snippet}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    suggestions: [
      "Nếu muốn, hãy tách từng khái niệm để giải thích sâu hơn theo từng bước.",
    ],
  };
};

const requestOpenAI = async (payload) => {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  if (!apiKey) return null;

  const baseUrl =
    process.env.OPENAI_BASE_URL ||
    process.env.AI_BASE_URL ||
    "https://api.openai.com/v1";
  const model =
    process.env.OPENAI_MODEL || process.env.AI_MODEL || "gpt-4o-mini";
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/chat/completions`);
  const transport = url.protocol === "http:" ? require("http") : https;

  const body = JSON.stringify({
    model,
    temperature: 0.4,
    messages: payload.messages,
    response_format: payload.response_format,
  });

  const options = {
    method: "POST",
    hostname: url.hostname,
    path: `${url.pathname}${url.search}`,
    port: url.port || 443,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Content-Length": Buffer.byteLength(body),
    },
  };

  const response = await new Promise((resolve, reject) => {
    const req = transport.request(options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        if (res.statusCode && res.statusCode >= 400) {
          return reject(
            new Error(raw || `AI provider error (${res.statusCode})`),
          );
        }
        try {
          resolve(JSON.parse(raw));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });

  return response;
};

const buildMessages = ({
  mode,
  title,
  content,
  subject,
  audience,
  level,
  questionCount,
  assignmentType,
}) => {
  const contextBlock = [
    title ? `Tiêu đề: ${title}` : null,
    subject ? `Môn học: ${subject}` : null,
    audience ? `Đối tượng: ${audience}` : null,
    level ? `Mức độ: ${level}` : null,
    assignmentType ? `Loại bài tập: ${assignmentType}` : null,
    questionCount ? `Số câu hỏi cần tạo: ${questionCount}` : null,
    content ? `Nội dung:\n${content}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  if (mode === "questions") {
    return [
      {
        role: "system",
        content:
          "Bạn là trợ lý học tập cho giáo viên Việt Nam. Chỉ trả về JSON hợp lệ, không kèm giải thích ngoài JSON.",
      },
      {
        role: "user",
        content: [
          "Hãy tạo bộ câu hỏi trắc nghiệm từ nội dung sau.",
          'Yêu cầu đầu ra JSON theo dạng: {"questions":[{"question":string,"options":[string,string,string,string],"answerIndex":number,"explanation":string,"difficulty":string}]}.',
          "Mỗi câu có đúng 4 lựa chọn, answerIndex là vị trí 0-3 của đáp án đúng.",
          "Câu hỏi nên rõ ràng, bám sát kiến thức cốt lõi, tránh câu mơ hồ.",
          contextBlock,
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    ];
  }

  if (mode === "rubric") {
    return [
      {
        role: "system",
        content:
          "Bạn là trợ lý thiết kế rubric cho giáo viên. Trả lời bằng tiếng Việt, rõ ràng, thực tế, dùng gạch đầu dòng nếu cần.",
      },
      {
        role: "user",
        content: [
          "Hãy gợi ý rubric chấm điểm cho bài tập sau.",
          "Tập trung vào các tiêu chí đánh giá, thang điểm và lưu ý khi chấm.",
          contextBlock,
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    ];
  }

  if (mode === "explain") {
    return [
      {
        role: "system",
        content:
          "Bạn là gia sư cho học sinh phổ thông. Giải thích ngắn gọn, dễ hiểu, đúng mức độ được yêu cầu.",
      },
      {
        role: "user",
        content: [
          `Hãy giải thích nội dung sau theo mức độ ${level || "intermediate"}.`,
          `Phong cách giải thích: ${levelHints[level] || levelHints.intermediate}.`,
          contextBlock,
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    ];
  }

  return [
    {
      role: "system",
      content:
        "Bạn là trợ lý học tập cho giáo viên và học sinh. Hãy viết ngắn gọn, súc tích, có cấu trúc rõ ràng.",
    },
    {
      role: "user",
      content: [
        "Hãy tóm tắt nội dung sau thành các ý chính dễ ôn tập.",
        contextBlock,
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
  ];
};

const generate = asyncHandler(async (req, res) => {
  const {
    mode,
    title,
    content,
    subject,
    audience,
    level,
    questionCount,
    assignmentType,
  } = req.body;

  const payload = {
    mode,
    title: title || "",
    content: content || "",
    subject: subject || "",
    audience: audience || "",
    level: level || "intermediate",
    questionCount: questionCount || 5,
    assignmentType: assignmentType || "",
  };

  const messages = buildMessages(payload);
  const aiResponse = await requestOpenAI({
    messages,
    response_format: mode === "questions" ? { type: "json_object" } : undefined,
  });

  if (!aiResponse) {
    return res.json(buildFallback(payload));
  }

  const text = aiResponse.choices?.[0]?.message?.content || "";

  if (mode === "questions") {
    try {
      const parsed = JSON.parse(extractJson(text));
      const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
      return res.json({
        mode,
        title: MODE_LABELS[mode],
        text: `Đã tạo ${questions.length} câu hỏi.`,
        questions,
        raw: text,
      });
    } catch (err) {
      return res.json({
        ...buildFallback(payload),
        raw: text,
      });
    }
  }

  return res.json({
    mode,
    title: MODE_LABELS[mode],
    text: text || buildFallback(payload).text,
    raw: text,
  });
});

module.exports = { generate };
