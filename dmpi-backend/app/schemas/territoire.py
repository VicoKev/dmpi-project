from pydantic import BaseModel


class DepartementOut(BaseModel):
    id_dep: int
    lib_dep: str

    class Config:
        from_attributes = True


class CommuneOut(BaseModel):
    id_com: int
    lib_com: str
    id_dep: int

    class Config:
        from_attributes = True


class ArrondissementOut(BaseModel):
    id_arrond: int
    lib_arrond: str
    id_com: int

    class Config:
        from_attributes = True


class QuartierOut(BaseModel):
    id_quart: int
    lib_quart: str
    id_arrond: int

    class Config:
        from_attributes = True
