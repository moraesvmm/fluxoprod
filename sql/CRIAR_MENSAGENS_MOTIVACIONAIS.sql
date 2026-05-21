-- Criação da tabela de mensagens motivacionais
CREATE TABLE IF NOT EXISTS public.mensagens_motivacionais (
  id SERIAL PRIMARY KEY,
  frase TEXT NOT NULL,
  autor TEXT NOT NULL,
  categoria TEXT
);

-- Habilitar RLS (Row Level Security) e criar política de leitura pública
ALTER TABLE public.mensagens_motivacionais ENABLE ROW LEVEL SECURITY;

-- Evita erro se a política já existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'mensagens_motivacionais' 
    AND policyname = 'Mensagens visíveis para todos os usuários logados'
  ) THEN
    CREATE POLICY "Mensagens visíveis para todos os usuários logados"
    ON public.mensagens_motivacionais FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

-- Limpar a tabela caso precise rodar o script novamente para atualizar as frases
TRUNCATE TABLE public.mensagens_motivacionais RESTART IDENTITY CASCADE;

-- Inserção de Frases Selecionadas (Foco: Sucesso com Paz/Filosofia, Autores Conceituados)
INSERT INTO public.mensagens_motivacionais (frase, autor, categoria) VALUES
('A paz não é a ausência de conflito, mas a capacidade de lidar com ele.', 'Mahatma Gandhi', 'Paz'),
('O sucesso não é o final, o fracasso não é fatal: é a coragem para continuar que conta.', 'Winston Churchill', 'Sucesso'),
('Você tem poder sobre a sua mente, não sobre os eventos externos. Perceba isso, e você encontrará a sua força.', 'Marco Aurélio', 'Sabedoria'),
('Não espere que os eventos aconteçam como você quer, mas decida querer o que acontece, e você será feliz.', 'Epicteto', 'Paz'),
('Não tente ser uma pessoa de sucesso, mas sim uma pessoa de valor.', 'Albert Einstein', 'Sucesso'),
('A maior glória em viver não está em nunca cair, mas em nos levantarmos toda vez que caímos.', 'Nelson Mandela', 'Resiliência'),
('Quem não está satisfeito com pouco, não ficará satisfeito com nada.', 'Epicuro', 'Sabedoria'),
('Se você quiser entender o universo, pense em energia, frequência e vibração.', 'Nikola Tesla', 'Sabedoria'),
('A melhor maneira de prever o futuro é criá-lo.', 'Peter Drucker', 'Sucesso'),
('A paz vem de dentro. Não a procure à sua volta.', 'Buda', 'Paz'),
('Aquele que domina os outros é forte; aquele que domina a si mesmo é poderoso.', 'Lao Tzu', 'Sucesso'),
('A mente que se abre a uma nova ideia jamais voltará ao seu tamanho original.', 'Albert Einstein', 'Sabedoria'),
('A única verdadeira sabedoria é saber que você não sabe nada.', 'Sócrates', 'Sabedoria'),
('A persistência é o caminho do êxito.', 'Charles Chaplin', 'Sucesso'),
('Conhece o teu inimigo e conhece a ti mesmo; em cem batalhas, não correrás perigo.', 'Sun Tzu', 'Sucesso'),
('O sofrimento deixa de ser sofrimento no momento em que encontra um significado.', 'Viktor Frankl', 'Resiliência'),
('Nós somos o que repetidamente fazemos. A excelência, portanto, não é um ato, mas um hábito.', 'Aristóteles', 'Sucesso'),
('Sorte é o que acontece quando a preparação encontra a oportunidade.', 'Sêneca', 'Sucesso'),
('Não há caminho para a paz. A paz é o caminho.', 'Mahatma Gandhi', 'Paz'),
('Onde há calma e meditação, não há nem ansiedade nem dúvida.', 'São Francisco de Assis', 'Paz');

-- RPC para pegar a frase do dia baseada no dia do ano
CREATE OR REPLACE FUNCTION get_frase_do_dia()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_frases INT;
    frase_index INT;
    resultado jsonb;
BEGIN
    SELECT count(*) INTO total_frases FROM public.mensagens_motivacionais;
    
    IF total_frases = 0 THEN
        RETURN jsonb_build_object(
            'frase', 'Aqui está um resumo das movimentações da sua empresa hoje.', 
            'autor', 'Sistema'
        );
    END IF;

    -- Usa o dia do ano (1 a 365) somado ao ano atual (para garantir rotatividade anual)
    -- O índice será de 0 até (total_frases - 1)
    frase_index := (EXTRACT(DOY FROM CURRENT_DATE)::INT + EXTRACT(YEAR FROM CURRENT_DATE)::INT) % total_frases;
    
    SELECT jsonb_build_object('frase', frase, 'autor', autor)
    INTO resultado
    FROM public.mensagens_motivacionais
    ORDER BY id
    OFFSET frase_index LIMIT 1;
    
    RETURN resultado;
END;
$$;
