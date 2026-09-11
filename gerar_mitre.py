"""Converte o enterprise.json (bundle STIX do MITRE ATT&CK, ~53MB) em um
data/mitre.json pequeno e plano, fácil de consumir no navegador.

Rode uma vez, sempre que quiser atualizar os dados:

    python gerar_mitre.py

O enterprise.json vem de https://github.com/mitre/cti (enterprise-attack.json)
e não precisa ir para o Git — só o data/mitre.json gerado.
"""

import json
import re
from pathlib import Path

RAIZ = Path(__file__).parent
ENTRADA = RAIZ / "enterprise.json"
SAIDA = RAIZ / "data" / "mitre.json"

# As descrições do MITRE vêm em markdown e cheias de "(Citation: Fulano 2017)".
# Isso só suja a tela, então tiramos.
CITACAO = re.compile(r"\(Citation:[^)]*\)")
LINK_MD = re.compile(r"\[([^\]]+)\]\([^)]+\)")


def limpa(texto):
    """Primeiro parágrafo da descrição, sem citações nem links de markdown."""
    if not texto:
        return ""
    primeiro = texto.split("\n\n")[0]
    primeiro = CITACAO.sub("", primeiro)
    primeiro = LINK_MD.sub(r"\1", primeiro)
    return " ".join(primeiro.split())


def attack_id(obj):
    """O código oficial (TA0001, T1055...) fica escondido em external_references."""
    for ref in obj.get("external_references", []):
        if ref.get("source_name") == "mitre-attack":
            return ref.get("external_id", "")
    return ""


def url_attack(obj):
    for ref in obj.get("external_references", []):
        if ref.get("source_name") == "mitre-attack":
            return ref.get("url", "")
    return ""


def vale(obj):
    """Ignora o que o MITRE já aposentou."""
    return not obj.get("revoked") and not obj.get("x_mitre_deprecated")


print(f"lendo {ENTRADA.name} ...")
bundle = json.loads(ENTRADA.read_text(encoding="utf-8"))
objetos = bundle["objects"]
print(f"  {len(objetos)} objetos no bundle")

# --- táticas ---------------------------------------------------------------

taticas_stix = {
    obj["id"]: obj
    for obj in objetos
    if obj["type"] == "x-mitre-tactic" and vale(obj)
}

# A matriz guarda a ordem oficial das táticas (Reconnaissance -> Impact).
ordem = []
for obj in objetos:
    if obj["type"] == "x-mitre-matrix" and vale(obj):
        ordem = obj.get("tactic_refs", [])
        break

refs_ordenadas = [r for r in ordem if r in taticas_stix]
refs_ordenadas += [r for r in taticas_stix if r not in refs_ordenadas]

taticas = []
# shortname ("defense-evasion") -> nome bonito ("Defense Evasion"),
# para as técnicas já saírem com o nome legível da tática.
nome_por_shortname = {}

for ref in refs_ordenadas:
    obj = taticas_stix[ref]
    short = obj.get("x_mitre_shortname", "")
    nome_por_shortname[short] = obj["name"]
    taticas.append({
        "id": attack_id(obj),
        "nome": obj["name"],
        "chave": short,
        "descricao": limpa(obj.get("description")),
        "url": url_attack(obj),
    })

print(f"  {len(taticas)} táticas")

# --- técnicas --------------------------------------------------------------

tecnicas = []

for obj in objetos:
    if obj["type"] != "attack-pattern" or not vale(obj):
        continue

    nomes_taticas = []
    for fase in obj.get("kill_chain_phases", []):
        if fase.get("kill_chain_name") == "mitre-attack":
            short = fase.get("phase_name", "")
            nomes_taticas.append(nome_por_shortname.get(short, short))

    tecnicas.append({
        "id": attack_id(obj),
        "nome": obj["name"],
        "sub": bool(obj.get("x_mitre_is_subtechnique")),
        "taticas": nomes_taticas,
        "plataformas": obj.get("x_mitre_platforms", []),
        "descricao": limpa(obj.get("description")),
        "url": url_attack(obj),
    })

tecnicas.sort(key=lambda t: t["id"])

principais = sum(1 for t in tecnicas if not t["sub"])
print(f"  {len(tecnicas)} técnicas ({principais} principais + {len(tecnicas) - principais} sub-técnicas)")

# --- grava -----------------------------------------------------------------

versao = ""
for obj in objetos:
    if obj["type"] == "x-mitre-collection":
        versao = obj.get("x_mitre_version", "")
        break

saida = {
    "versao": versao,
    "taticas": taticas,
    "tecnicas": tecnicas,
}

SAIDA.write_text(
    json.dumps(saida, ensure_ascii=False, indent=1),
    encoding="utf-8",
)

kb = SAIDA.stat().st_size / 1024
print(f"gerado {SAIDA.relative_to(RAIZ)} ({kb:.0f} KB)")
