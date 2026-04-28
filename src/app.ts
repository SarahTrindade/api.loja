// app.ts — seu primeiro servidor Express!
import express, { Request, Response, NextFunction } from "express";
import { readFile, writeFile } from "fs/promises";

// 1. Criar a aplicação Express
const app = express();

// 2. Definir a porta onde o servidor vai escutar
const PORT = 3000;

const ARQUIVO = "dados.json";

export async function carregarAlunos(): Promise<Aluno[]> {
  try {
    const texto = await readFile(ARQUIVO, "utf-8");
    return JSON.parse(texto) as Aluno[];
  } catch {
    await writeFile(ARQUIVO, "[]");
    return [];
  }
}

export async function salvarAlunos(alunos: Aluno[]): Promise<void> {
  const texto = JSON.stringify(alunos, null, 2);
  await writeFile(ARQUIVO, texto);
}

app.use(express.static("public"));

// Middleware de Logger — registra cada requisição no console
app.use((req: Request, res: Response, next: NextFunction) => {
  const agora = new Date().toLocaleTimeString();
  console.log(`[${agora}] ${req.method} ${req.url}`);

  // OBRIGATÓRIO: chamar next() para passar para o próximo middleware/rota
  next();
});

// Função que RETORNA um middleware de validação
function validarCampos(camposObrigatorios: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const erros: string[] = [];

    for (const campo of camposObrigatorios) {
      if (!req.body[campo] && req.body[campo] !== 0) {
        erros.push(`Campo '${campo}' é obrigatório`);
      }
    }

    if (erros.length > 0) {
      res.status(400).json({ sucesso: false, erros });
      return;  // PARA aqui, não chama next()
    }
    next();  // Tudo OK, segue para a rota!
  };
}

app.use(express.json());

app.set("view engine", "ejs");      // Diz ao Express: use EJS
app.set("views", "./src/views");    // Pasta onde estão as views


interface Aluno {
  id: number;
  nome: string;
  idade: number;
  turma: string;
  nota: number;
}



interface CriarAlunoBody {
  nome: string;
  turma: string;
  idade: number;
  nota: number;
}

interface AtualizarAlunoBody {
  nome?: string;   // opcional — só atualiza o que for enviado
  turma?: string;
  idade?: number;
  nota?: number;
}

interface AlunoParams {
  id: string;  // params SEMPRE é string!
}

interface FiltroQuery {
  turma?: string;
  aprovados?: string;  // query SEMPRE é string!
}

interface ApiResponse<T> {
  sucesso: boolean;
  dados?: T;
  erro?: string;
  erros?: string[];
}



let alunos: Aluno[] = [];
let proximoId = 1;


app.get("/alunos", async (req: Request<{}, {}, {}, FiltroQuery>, res: Response) => {
  try {
    let alunos = await carregarAlunos();

    if (req.query.turma) {
      alunos = alunos.filter(a => a.turma === req.query.turma);
    }

    res.json(alunos);
  } catch {
    res.status(500).json({ erro: "Erro ao carregar alunos" });
  }
});

app.get("/alunos/:id", async (req: Request<AlunoParams>, res: Response) => {
  try {
    const alunos = await carregarAlunos();
    const aluno = alunos.find(a => a.id === Number(req.params.id));

    if (!aluno) {
      return res.status(404).json({ erro: "Aluno não encontrado" });
    }

    res.json(aluno);
  } catch {
    res.status(500).json({ erro: "Erro interno" });
  }
});


// POST — cadastrar novo aluno
app.post(
  "/alunos",
  validarCampos(["nome", "idade", "turma", "nota"]),
  async (req: Request<{}, {}, CriarAlunoBody>, res: Response) => {
    try {
      const alunos = await carregarAlunos();

      const { nome, idade, turma, nota } = req.body;

      const novoAluno: Aluno = {
        id: Date.now(),
        nome,
        idade,
        turma,
        nota
      };

      alunos.push(novoAluno);
      await salvarAlunos(alunos);

      res.status(201).json({ sucesso: true, dados: novoAluno });
    } catch {
      res.status(500).json({ erro: "Erro ao criar aluno" });
    }
  }
);

// PUT /alunos/:id — Atualizar aluno existente no array
app.put(
  "/alunos/:id",
  async (req: Request<AlunoParams, {}, AtualizarAlunoBody>, res: Response) => {
    try {
      const alunos = await carregarAlunos();
      const id = Number(req.params.id);

      const index = alunos.findIndex(a => a.id === id);

      if (index === -1) {
        return res.status(404).json({ erro: "Aluno não encontrado" });
      }

      const aluno = alunos[index];
      if (!aluno) {
        return res.status(404).json({ erro: "Aluno não encontrado" });
      }

      alunos[index] = {
        id: aluno.id,
        nome: req.body.nome ?? aluno.nome,
        idade: req.body.idade ?? aluno.idade,
        turma: req.body.turma ?? aluno.turma,
        nota: req.body.nota ?? aluno.nota,
      };

      await salvarAlunos(alunos);

      res.json(alunos[index]);
    } catch {
      res.status(500).json({ erro: "Erro ao atualizar" });
    }
  }
);



//DELETE

app.delete("/alunos/:id", async (req: Request<AlunoParams>, res: Response) => {
  try {
    const alunos = await carregarAlunos();
    const id = Number(req.params.id);

    const index = alunos.findIndex(a => a.id === id);

    if (index === -1) {
      return res.status(404).json({ erro: "Aluno não encontrado" });
    }

    const removido = alunos.splice(index, 1);

    await salvarAlunos(alunos);

    res.json({ mensagem: "Aluno removido", aluno: removido[0] });
  } catch {
    res.status(500).json({ erro: "Erro ao deletar" });
  }
});

// 3. Iniciar o servidor (começa a escutar requisições!)
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

