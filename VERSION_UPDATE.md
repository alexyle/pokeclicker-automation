# Mise à jour facile de la version

Pour mettre à jour la version simplement:

```bash
npm run update-version
```

Cela va:
1. Mettre à jour le fichier `VERSION` avec le hash court du commit actuel
2. Mettre à jour la version dans `src/Automation.js`

Vous n'avez plus besoin de changer la version manuellement!

## Automatisation (optionnel)

Vous pouvez aussi ajouter un git hook pour mettre à jour automatiquement la version après chaque commit:

```bash
cat > .git/hooks/post-commit << 'EOF'
#!/bin/bash
npm run update-version > /dev/null 2>&1 && git add VERSION && git commit --amend --no-edit
EOF
chmod +x .git/hooks/post-commit
```
