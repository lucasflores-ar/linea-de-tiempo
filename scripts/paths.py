# -*- coding: utf-8 -*-
"""Rutas compartidas del pipeline. Override con env LT_DATABASE_DIR si hace falta."""
import os

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DATABASE_DIR = os.environ.get(
    'LT_DATABASE_DIR',
    r'J:\AI\PROJECTOS\JW GAME\DATABASE_preguntas',
)
SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))


def db(*parts):
    return os.path.join(DATABASE_DIR, *parts)


def repo(*parts):
    return os.path.join(REPO_ROOT, *parts)
