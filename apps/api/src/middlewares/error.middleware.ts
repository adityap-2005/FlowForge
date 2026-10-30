import type { Request, Response, NextFunction } from "express";
import { Prisma } from "../generated/prisma/client.js";
import AppError from "../utils/AppError.js";

const errorHandler = (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
) => {
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
        return;
    }

    if (
        err instanceof Prisma.PrismaClientKnownRequestError
    ) {
        if (err.code === "P2002") {
            res.status(409).json({
                success: false,
                message: "A record with these values already exists",
            });
            return;
        }

        if (err.code === "P2025") {
            res.status(404).json({
                success: false,
                message: "Requested record not found",
            });
            return;
        }

        if (err.code === "P2003") {
            res.status(400).json({
                success: false,
                message: "Foreign key constraint failed",
            });
            return;
        }
    }

    console.error(err);

    res.status(500).json({
        success: false,
        message: "Internal Server Error",
    });
};

export default errorHandler;