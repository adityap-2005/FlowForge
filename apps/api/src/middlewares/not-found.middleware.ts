import type { Request, Response, NextFunction } from "express";
import AppError from "../utils/AppError.js";

const notFoundHandler = (
    req: Request,
    _res: Response,
    next: NextFunction
) => {
    next(
        new AppError(
            `Route ${req.method} ${req.originalUrl} not found`,
            404
        )
    );
};

export default notFoundHandler;