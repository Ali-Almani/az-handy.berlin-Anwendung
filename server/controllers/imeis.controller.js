import ImeisUserData from '../models/ImeisUserData.js';

const USE_MEMORY_DB = process.env.USE_MEMORY_DB === 'true' ||
  (!process.env.DATABASE_URL && !process.env.PG_DATABASE && !process.env.PG_USER);

export const getImeisData = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    if (USE_MEMORY_DB) {
      const [data] = await ImeisUserData.findOrCreate({
        where: { user_id: userId },
        defaults: { cell_colors_json: '{}', row_actions_json: '{}', copy_history_json: '[]', copy_timestamps_json: '[]' }
      });
      const imeis = data.imeis_json ? JSON.parse(data.imeis_json) : [];
      const cellColors = data.cell_colors_json ? JSON.parse(data.cell_colors_json) : {};
      const rowActions = data.row_actions_json ? JSON.parse(data.row_actions_json) : {};
      const copyHistory = data.copy_history_json ? JSON.parse(data.copy_history_json) : [];
      const copyTimestamps = data.copy_timestamps_json ? JSON.parse(data.copy_timestamps_json) : [];
      return res.json({
        success: true,
        imeis,
        cellColors,
        rowActions,
        copyHistory,
        copyTimestamps
      });
    }

    const [data, created] = await ImeisUserData.findOrCreate({
      where: { user_id: userId },
      defaults: { cell_colors_json: '{}', row_actions_json: '{}', copy_history_json: '[]' }
    });

    const imeis = data.imeis_json ? JSON.parse(data.imeis_json) : [];
    const cellColors = data.cell_colors_json ? JSON.parse(data.cell_colors_json) : {};
    const rowActions = data.row_actions_json ? JSON.parse(data.row_actions_json) : {};
    const copyHistory = data.copy_history_json ? JSON.parse(data.copy_history_json) : [];
    const copyTimestamps = data.copy_timestamps_json ? JSON.parse(data.copy_timestamps_json) : [];

    res.json({
      success: true,
      imeis,
      cellColors,
      rowActions,
      copyHistory,
      copyTimestamps
    });
  } catch (error) {
    next(error);
  }
};

export const saveImeisData = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { imeis, cellColors, rowActions, copyHistory, copyTimestamps } = req.body;

    const payload = {
      user_id: userId,
      ...(imeis !== undefined && { imeis_json: JSON.stringify(imeis) }),
      ...(cellColors !== undefined && { cell_colors_json: JSON.stringify(cellColors) }),
      ...(rowActions !== undefined && { row_actions_json: JSON.stringify(rowActions) }),
      ...(copyHistory !== undefined && { copy_history_json: JSON.stringify(copyHistory) }),
      ...(copyTimestamps !== undefined && { copy_timestamps_json: JSON.stringify(copyTimestamps) })
    };

    if (USE_MEMORY_DB) {
      await ImeisUserData.upsert(payload);
      return res.json({ success: true, message: 'IMEIS-Daten gespeichert' });
    }

    const [data] = await ImeisUserData.findOrCreate({
      where: { user_id: userId },
      defaults: { cell_colors_json: '{}', row_actions_json: '{}', copy_history_json: '[]' }
    });

    if (imeis !== undefined) data.imeis_json = JSON.stringify(imeis);
    if (cellColors !== undefined) data.cell_colors_json = JSON.stringify(cellColors);
    if (rowActions !== undefined) data.row_actions_json = JSON.stringify(rowActions);
    if (copyHistory !== undefined) data.copy_history_json = JSON.stringify(copyHistory);
    if (copyTimestamps !== undefined) data.copy_timestamps_json = JSON.stringify(copyTimestamps);
    await data.save();

    res.json({ success: true, message: 'IMEIS-Daten gespeichert' });
  } catch (error) {
    next(error);
  }
};
